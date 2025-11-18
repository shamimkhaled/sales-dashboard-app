from django.contrib import admin
from .models import Feedback, FeedbackComment, FeedbackVote


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'title', 'category', 'priority', 'status',
        'submitted_by', 'vote_count', 'view_count', 'created_at'
    ]
    list_filter = ['status', 'category', 'priority', 'created_at']
    search_fields = ['title', 'description', 'submitted_by__email', 'email']
    readonly_fields = [
        'vote_count', 'view_count', 'created_at', 'updated_at',
        'reviewed_at', 'completion_date'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'category', 'priority', 'status')
        }),
        ('Submitter Information', {
            'fields': ('submitted_by', 'email')
        }),
        ('Details', {
            'fields': (
                'expected_benefit', 'use_case', 'current_workaround',
                'related_module', 'attachment'
            )
        }),
        ('Management', {
            'fields': (
                'reviewed_by', 'reviewed_at', 'estimated_effort',
                'completion_date', 'internal_notes'
            )
        }),
        ('Statistics', {
            'fields': ('vote_count', 'view_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(FeedbackComment)
class FeedbackCommentAdmin(admin.ModelAdmin):
    list_display = ['id', 'feedback', 'user', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['content', 'feedback__title', 'user__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(FeedbackVote)
class FeedbackVoteAdmin(admin.ModelAdmin):
    list_display = ['id', 'feedback', 'user', 'created_at']
    list_filter = ['created_at']
    search_fields = ['feedback__title', 'user__email']
    readonly_fields = ['created_at']

