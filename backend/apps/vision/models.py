from django.db import models


class PlayerTracking(models.Model):
    """Frame-by-frame player position from video tracking."""

    match = models.ForeignKey('matches.Match', on_delete=models.CASCADE,
                              related_name='tracking_data')
    player = models.ForeignKey('teams.Player', on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='tracking_data')
    track_id = models.IntegerField(help_text='ByteTrack assigned ID')
    frame_number = models.PositiveIntegerField()
    timestamp_sec = models.DecimalField(max_digits=10, decimal_places=3)
    pitch_x = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True,
                                  help_text='Homography-projected pitch x (0–100)')
    pitch_y = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True,
                                  help_text='Homography-projected pitch y (0–100)')
    pixel_x = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    pixel_y = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    speed_mps = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True,
                                    help_text='Metres per second — only valid if is_calibrated')
    is_calibrated = models.BooleanField(default=False,
                                        help_text='True only after 4-point homography')

    class Meta:
        db_table = 'vision_playertracking'
        ordering = ['match', 'frame_number', 'track_id']
        indexes = [
            models.Index(fields=['match', 'track_id']),
            models.Index(fields=['match', 'frame_number']),
        ]

    def __str__(self):
        return f"Frame {self.frame_number} Track#{self.track_id}"


class VideoJob(models.Model):
    """Async video processing job."""

    class JobStatus(models.TextChoices):
        QUEUED = 'QUEUED', 'Queued'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    match = models.ForeignKey('matches.Match', on_delete=models.CASCADE,
                              related_name='video_jobs')
    video_file = models.FileField(upload_to='videos/')
    status = models.CharField(max_length=12, choices=JobStatus.choices,
                              default=JobStatus.QUEUED)
    progress_pct = models.PositiveSmallIntegerField(default=0)
    total_frames = models.PositiveIntegerField(default=0)
    processed_frames = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    homography_points = models.JSONField(null=True, blank=True,
                                         help_text='4 src/dst point pairs for calibration')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'vision_videojob'
        ordering = ['-created_at']

    def __str__(self):
        return f"VideoJob #{self.pk} ({self.status})"
