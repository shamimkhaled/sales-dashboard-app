from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from .models import Feedback, FeedbackComment, FeedbackVote
from .serializers import (
    FeedbackSerializer,
    FeedbackCreateSerializer,
    FeedbackUpdateSerializer,
    FeedbackStatusUpdateSerializer,
    FeedbackCommentSerializer,
    FeedbackVoteSerializer
)
from apps.authentication.permissions import RequirePermissions


class FeedbackListCreateView(generics.ListCreateAPIView):
    """
    List all feedback items or create a new feedback submission
    GET: List feedback with filtering and search
    POST: Submit new feedback/requirement
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['feedback:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'priority', 'submitted_by']
    search_fields = ['title', 'description', 'related_module']
    ordering_fields = ['created_at', 'updated_at', 'vote_count', 'priority']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Feedback.objects.select_related(
            'submitted_by', 'reviewed_by'
        ).prefetch_related(
            'comments', 'votes'
        ).annotate(
            comments_count=Count('comments', filter=Q(comments__is_internal=False))
        ).all()

        user = self.request.user
        
        # Sales persons can only see their own feedback and public feedback
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(
                Q(submitted_by=user) | Q(status__in=['pending', 'approved', 'completed'])
            )
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        # Filter by category if provided
        category_filter = self.request.query_params.get('category')
        if category_filter:
            qs = qs.filter(category=category_filter)
        
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return FeedbackCreateSerializer
        return FeedbackSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        self.required_permissions = ['feedback:create']
        serializer.save()


class FeedbackDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific feedback item
    """
    queryset = Feedback.objects.select_related(
        'submitted_by', 'reviewed_by'
    ).prefetch_related(
        'comments__user', 'votes__user'
    ).all()
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['feedback:read']

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            # Check if user can manage (admin) or just edit (owner)
            obj = self.get_object()
            user = self.request.user
            can_manage = (
                user.is_superuser or
                (user.role and user.role.name in ['super_admin', 'admin', 'sales_manager'])
            )
            
            if can_manage:
                return FeedbackStatusUpdateSerializer
            return FeedbackUpdateSerializer
        return FeedbackSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def retrieve(self, request, *args, **kwargs):
        """Increment view count when feedback is viewed"""
        instance = self.get_object()
        instance.increment_view_count()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        
        # Sales persons can only see their own feedback and public feedback
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(
                Q(submitted_by=user) | Q(status__in=['pending', 'approved', 'completed'])
            )
        
        return qs


class FeedbackVoteView(APIView):
    """
    Vote (upvote) or remove vote on a feedback item
    POST /api/feedback/<id>/vote/ - Add vote
    DELETE /api/feedback/<id>/vote/ - Remove vote
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['feedback:read']

    def post(self, request, pk):
        """Add a vote to feedback"""
        try:
            feedback = Feedback.objects.get(pk=pk)
        except Feedback.DoesNotExist:
            return Response(
                {'detail': 'Feedback not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user already voted
        vote, created = FeedbackVote.objects.get_or_create(
            feedback=feedback,
            user=request.user
        )

        if created:
            serializer = FeedbackVoteSerializer(vote)
            return Response({
                'success': True,
                'message': 'Vote added successfully',
                'vote': serializer.data,
                'vote_count': feedback.vote_count
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'message': 'You have already voted on this feedback',
                'vote_count': feedback.vote_count
            }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Remove a vote from feedback"""
        try:
            feedback = Feedback.objects.get(pk=pk)
        except Feedback.DoesNotExist:
            return Response(
                {'detail': 'Feedback not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            vote = FeedbackVote.objects.get(feedback=feedback, user=request.user)
            vote.delete()
            return Response({
                'success': True,
                'message': 'Vote removed successfully',
                'vote_count': feedback.vote_count
            })
        except FeedbackVote.DoesNotExist:
            return Response({
                'success': False,
                'message': 'You have not voted on this feedback'
            }, status=status.HTTP_400_BAD_REQUEST)


class FeedbackCommentListCreateView(generics.ListCreateAPIView):
    """
    List comments or add a comment to a feedback item
    GET /api/feedback/<feedback_id>/comments/
    POST /api/feedback/<feedback_id>/comments/
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['feedback:read']
    serializer_class = FeedbackCommentSerializer

    def get_queryset(self):
        feedback_id = self.kwargs['feedback_id']
        qs = FeedbackComment.objects.filter(
            feedback_id=feedback_id
        ).select_related('user').order_by('created_at')

        user = self.request.user
        # Non-admins can only see public comments
        is_admin = user.is_superuser or (
            user.role and user.role.name in ['super_admin', 'admin', 'sales_manager']
        )
        if not is_admin:
            qs = qs.filter(is_internal=False)

        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        feedback_id = self.kwargs['feedback_id']
        try:
            feedback = Feedback.objects.get(pk=feedback_id)
        except Feedback.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Feedback not found')

        serializer.save(
            feedback=feedback,
            user=self.request.user
        )


class FeedbackCommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific comment
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['feedback:read']
    serializer_class = FeedbackCommentSerializer

    def get_queryset(self):
        qs = FeedbackComment.objects.select_related('user', 'feedback').all()
        
        user = self.request.user
        # Non-admins can only see public comments
        is_admin = user.is_superuser or (
            user.role and user.role.name in ['super_admin', 'admin', 'sales_manager']
        )
        if not is_admin:
            qs = qs.filter(is_internal=False)
        
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_update(self, serializer):
        """Only allow editing own comments or admin editing any"""
        comment = self.get_object()
        user = self.request.user
        
        if comment.user != user:
            is_admin = user.is_superuser or (
                user.role and user.role.name in ['super_admin', 'admin']
            )
            if not is_admin:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can only edit your own comments')
        
        serializer.save()

    def perform_destroy(self, instance):
        """Only allow deleting own comments or admin deleting any"""
        user = self.request.user
        
        if instance.user != user:
            is_admin = user.is_superuser or (
                user.role and user.role.name in ['super_admin', 'admin']
            )
            if not is_admin:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You can only delete your own comments')
        
        instance.delete()


class FeedbackStatsView(APIView):
    """
    Get statistics about feedback
    GET /api/feedback/stats/
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['feedback:read']

    def get(self, request):
        """Get feedback statistics"""
        user = self.request.user
        is_admin = user.is_superuser or (
            user.role and user.role.name in ['super_admin', 'admin', 'sales_manager']
        )

        # Base queryset
        if is_admin:
            qs = Feedback.objects.all()
        else:
            # Regular users see their own feedback and public ones
            qs = Feedback.objects.filter(
                Q(submitted_by=user) | Q(status__in=['pending', 'approved', 'completed'])
            )

        stats = {
            'total': qs.count(),
            'by_status': dict(qs.values('status').annotate(
                count=Count('id')
            ).values_list('status', 'count')),
            'by_category': dict(qs.values('category').annotate(
                count=Count('id')
            ).values_list('category', 'count')),
            'by_priority': dict(qs.values('priority').annotate(
                count=Count('id')
            ).values_list('priority', 'count')),
            'my_feedback_count': Feedback.objects.filter(submitted_by=user).count() if user.is_authenticated else 0,
            'my_votes_count': FeedbackVote.objects.filter(user=user).count() if user.is_authenticated else 0,
        }

        return Response(stats)


class MyFeedbackView(generics.ListAPIView):
    """
    Get all feedback submitted by the current user
    GET /api/feedback/my-feedback/
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['feedback:read']
    serializer_class = FeedbackSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'priority']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'vote_count']
    ordering = ['-created_at']

    def get_queryset(self):
        return Feedback.objects.filter(
            submitted_by=self.request.user
        ).select_related('submitted_by', 'reviewed_by').prefetch_related(
            'comments', 'votes'
        ).all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

