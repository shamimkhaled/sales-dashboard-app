from django.db import models
from django.conf import settings
from django.utils import timezone


class Feedback(models.Model):
    """
    User feedback and feature requirements for improving the application
    """
    CATEGORY_CHOICES = (
        ('feature_request', 'Feature Request'),
        ('bug_report', 'Bug Report'),
        ('improvement', 'Improvement'),
        ('ui_ux', 'UI/UX Enhancement'),
        ('performance', 'Performance'),
        ('security', 'Security'),
        ('integration', 'Integration'),
        ('documentation', 'Documentation'),
        ('other', 'Other'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending Review'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
        ('on_hold', 'On Hold'),
    )

    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )

    # Basic Information
    title = models.CharField(max_length=255, help_text='Brief title describing the feedback/requirement')
    description = models.TextField(help_text='Detailed description of the feedback or requirement')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='feature_request')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)

    # User Information
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='submitted_feedback',
        help_text='User who submitted this feedback'
    )
    email = models.EmailField(
        blank=True,
        help_text='Contact email (if different from user email)'
    )

    # Additional Details
    expected_benefit = models.TextField(
        blank=True,
        help_text='Expected benefit or impact of this feature/improvement'
    )
    use_case = models.TextField(
        blank=True,
        help_text='Specific use case or scenario where this would be helpful'
    )
    current_workaround = models.TextField(
        blank=True,
        help_text='Current workaround (if applicable)'
    )
    related_module = models.CharField(
        max_length=100,
        blank=True,
        help_text='Related module/feature (e.g., Customers, Bills, Invoices)'
    )

    # Attachments
    attachment = models.FileField(
        upload_to='feedback_attachments/',
        null=True,
        blank=True,
        help_text='Optional attachment (screenshot, document, etc.)'
    )

    # Metadata
    vote_count = models.IntegerField(default=0, help_text='Number of upvotes')
    view_count = models.IntegerField(default=0, help_text='Number of views')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_feedback',
        help_text='Admin/Manager who reviewed this feedback'
    )
    completion_date = models.DateTimeField(null=True, blank=True)
    estimated_effort = models.CharField(
        max_length=50,
        blank=True,
        help_text='Estimated development effort (e.g., "2 weeks", "1 month")'
    )
    internal_notes = models.TextField(
        blank=True,
        help_text='Internal notes for development team (not visible to submitter)'
    )

    class Meta:
        db_table = 'feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['category']),
            models.Index(fields=['priority']),
            models.Index(fields=['submitted_by']),
            models.Index(fields=['-vote_count']),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

    def increment_view_count(self):
        """Increment view count"""
        self.view_count += 1
        self.save(update_fields=['view_count'])


class FeedbackComment(models.Model):
    """
    Comments on feedback items for discussions
    """
    feedback = models.ForeignKey(
        Feedback,
        on_delete=models.CASCADE,
        related_name='comments',
        help_text='Feedback item this comment belongs to'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedback_comments',
        help_text='User who posted this comment'
    )
    content = models.TextField(help_text='Comment content')
    is_internal = models.BooleanField(
        default=False,
        help_text='Internal comment (only visible to admins/managers)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'feedback_comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['feedback']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Comment on {self.feedback.title} by {self.user}"


class FeedbackVote(models.Model):
    """
    Votes (upvotes) on feedback items
    """
    feedback = models.ForeignKey(
        Feedback,
        on_delete=models.CASCADE,
        related_name='votes',
        help_text='Feedback item being voted on'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedback_votes',
        help_text='User who voted'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback_votes'
        unique_together = [['feedback', 'user']]
        indexes = [
            models.Index(fields=['feedback', 'user']),
        ]

    def __str__(self):
        return f"{self.user} voted on {self.feedback.title}"

    def save(self, *args, **kwargs):
        """Update vote count when vote is created"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.feedback.vote_count = self.feedback.votes.count()
            self.feedback.save(update_fields=['vote_count'])

    def delete(self, *args, **kwargs):
        """Update vote count when vote is deleted"""
        feedback = self.feedback
        super().delete(*args, **kwargs)
        feedback.vote_count = feedback.votes.count()
        feedback.save(update_fields=['vote_count'])

