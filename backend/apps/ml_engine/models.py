from django.db import models


class MLModel(models.Model):
    """Registry entry for a trained ML model artifact."""

    class Algorithm(models.TextChoices):
        KMEANS = 'KMEANS', 'K-Means Clustering'
        RANDOM_FOREST = 'RANDOM_FOREST', 'Random Forest'
        LOGISTIC_REGRESSION = 'LOGISTIC_REGRESSION', 'Logistic Regression'
        ISOLATION_FOREST = 'ISOLATION_FOREST', 'Isolation Forest'
        TIME_SERIES = 'TIME_SERIES', 'Time-Series Analysis'

    name = models.CharField(max_length=120)
    algorithm = models.CharField(max_length=25, choices=Algorithm.choices)
    version = models.CharField(max_length=20, default='1.0.0')
    description = models.TextField(blank=True)
    training_sample_count = models.PositiveIntegerField(default=0)
    metrics = models.JSONField(default=dict, blank=True,
                               help_text='e.g. {"accuracy": 0.87, "f1": 0.82}')
    artifact_path = models.CharField(max_length=500, blank=True,
                                     help_text='Path to pickled model file')
    is_active = models.BooleanField(default=False)
    trained_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ml_engine_mlmodel'
        ordering = ['-created_at']
        unique_together = [('name', 'version')]

    def __str__(self):
        active = '✓' if self.is_active else '✗'
        return f"[{active}] {self.name} v{self.version} ({self.algorithm})"
