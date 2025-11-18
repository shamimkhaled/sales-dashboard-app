from django.urls import path
from .views import (
    FeedbackListCreateView,
    FeedbackDetailView,
    FeedbackVoteView,
    FeedbackCommentListCreateView,
    FeedbackCommentDetailView,
    FeedbackStatsView,
    MyFeedbackView,
)

urlpatterns = [
    # Feedback CRUD
    path('', FeedbackListCreateView.as_view(), name='feedback-list-create'),
    path('<int:pk>/', FeedbackDetailView.as_view(), name='feedback-detail'),
    
    # Voting
    path('<int:pk>/vote/', FeedbackVoteView.as_view(), name='feedback-vote'),
    
    # Comments
    path('<int:feedback_id>/comments/', FeedbackCommentListCreateView.as_view(), name='feedback-comments'),
    path('comments/<int:pk>/', FeedbackCommentDetailView.as_view(), name='feedback-comment-detail'),
    
    # Statistics and user-specific
    path('stats/', FeedbackStatsView.as_view(), name='feedback-stats'),
    path('my-feedback/', MyFeedbackView.as_view(), name='my-feedback'),
]

