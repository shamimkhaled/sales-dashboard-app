from rest_framework import serializers
from .models import Feedback, FeedbackComment, FeedbackVote
from apps.users.serializers import UserSerializer


class FeedbackVoteSerializer(serializers.ModelSerializer):
    """Serializer for feedback votes"""
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackVote
        fields = ['id', 'user', 'user_details', 'created_at']
        read_only_fields = ['created_at']

    def get_user_details(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'email': obj.user.email,
            }
        return None


class FeedbackCommentSerializer(serializers.ModelSerializer):
    """Serializer for feedback comments"""
    user_details = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackComment
        fields = [
            'id', 'feedback', 'user', 'user_details', 'content',
            'is_internal', 'created_at', 'updated_at', 'can_edit'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_user_details(self, obj):
        if obj.user:
            return {
                'id': obj.user.id,
                'username': obj.user.username,
                'email': obj.user.email,
            }
        return None

    def get_can_edit(self, obj):
        """Check if current user can edit this comment"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # User can edit their own comments, or admins can edit any
        return obj.user == request.user or (
            request.user.is_superuser or
            (request.user.role and request.user.role.name in ['super_admin', 'admin'])
        )


class FeedbackSerializer(serializers.ModelSerializer):
    """Main serializer for feedback items"""
    submitted_by_details = serializers.SerializerMethodField()
    reviewed_by_details = serializers.SerializerMethodField()
    comments = FeedbackCommentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = [
            'id', 'title', 'description', 'category', 'priority', 'status',
            'submitted_by', 'submitted_by_details', 'email',
            'expected_benefit', 'use_case', 'current_workaround', 'related_module',
            'attachment', 'vote_count', 'view_count',
            'created_at', 'updated_at', 'reviewed_at', 'reviewed_by', 'reviewed_by_details',
            'completion_date', 'estimated_effort', 'internal_notes',
            'comments', 'comments_count', 'has_voted',
            'can_edit', 'can_delete', 'can_manage'
        ]
        read_only_fields = [
            'vote_count', 'view_count', 'created_at', 'updated_at',
            'reviewed_at', 'reviewed_by', 'completion_date'
        ]

    def get_submitted_by_details(self, obj):
        if obj.submitted_by:
            return {
                'id': obj.submitted_by.id,
                'username': obj.submitted_by.username,
                'email': obj.submitted_by.email,
            }
        return None

    def get_reviewed_by_details(self, obj):
        if obj.reviewed_by:
            return {
                'id': obj.reviewed_by.id,
                'username': obj.reviewed_by.username,
                'email': obj.reviewed_by.email,
            }
        return None

    def get_comments_count(self, obj):
        """Get count of public comments"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Admins can see all comments, others only see public ones
            user = request.user
            is_admin = user.is_superuser or (
                user.role and user.role.name in ['super_admin', 'admin', 'sales_manager']
            )
            if is_admin:
                return obj.comments.count()
            return obj.comments.filter(is_internal=False).count()
        return obj.comments.filter(is_internal=False).count()

    def get_has_voted(self, obj):
        """Check if current user has voted on this feedback"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()

    def get_can_edit(self, obj):
        """Check if current user can edit this feedback"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # User can edit their own feedback, or admins can edit any
        return obj.submitted_by == request.user or (
            request.user.is_superuser or
            (request.user.role and request.user.role.name in ['super_admin', 'admin'])
        )

    def get_can_delete(self, obj):
        """Check if current user can delete this feedback"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # User can delete their own feedback, or admins can delete any
        return obj.submitted_by == request.user or (
            request.user.is_superuser or
            (request.user.role and request.user.role.name in ['super_admin', 'admin'])
        )

    def get_can_manage(self, obj):
        """Check if current user can manage (change status, etc.) this feedback"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # Only admins and managers can manage feedback
        return (
            request.user.is_superuser or
            (request.user.role and request.user.role.name in ['super_admin', 'admin', 'sales_manager'])
        )

    def to_representation(self, instance):
        """Customize representation based on user permissions"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and request.user.is_authenticated:
            user = request.user
            is_admin = user.is_superuser or (
                user.role and user.role.name in ['super_admin', 'admin', 'sales_manager']
            )
            
            # Hide internal notes from non-admins
            if not is_admin:
                data.pop('internal_notes', None)
            
            # Filter comments based on permissions
            if 'comments' in data:
                if not is_admin:
                    data['comments'] = [
                        comment for comment in data['comments']
                        if not comment.get('is_internal', False)
                    ]
        else:
            # Hide internal notes and comments for anonymous users
            data.pop('internal_notes', None)
            if 'comments' in data:
                data['comments'] = [
                    comment for comment in data['comments']
                    if not comment.get('is_internal', False)
                ]
        
        return data


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating feedback (excludes some fields)"""
    
    class Meta:
        model = Feedback
        fields = [
            'title', 'description', 'category', 'priority',
            'email', 'expected_benefit', 'use_case',
            'current_workaround', 'related_module', 'attachment'
        ]

    def create(self, validated_data):
        """Create feedback with submitted_by set to current user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['submitted_by'] = request.user
        return super().create(validated_data)


class FeedbackUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating feedback"""
    
    class Meta:
        model = Feedback
        fields = [
            'title', 'description', 'category', 'priority',
            'email', 'expected_benefit', 'use_case',
            'current_workaround', 'related_module', 'attachment'
        ]


class FeedbackStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating feedback status (admin only)"""
    
    class Meta:
        model = Feedback
        fields = [
            'status', 'priority', 'estimated_effort', 'internal_notes',
            'completion_date'
        ]

    def update(self, instance, validated_data):
        """Update status and set reviewed_by"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from django.utils import timezone
            instance.reviewed_by = request.user
            instance.reviewed_at = timezone.now()
            
            # Set completion_date if status is completed
            if validated_data.get('status') == 'completed' and not instance.completion_date:
                instance.completion_date = timezone.now()
        
        return super().update(instance, validated_data)

