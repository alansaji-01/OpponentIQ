from django.db import models
from django.conf import settings


class AnalysisReport(models.Model):
    """AI-generated tactical analysis report."""

    class GenerationMode(models.TextChoices):
        AI = 'AI', 'AI-Generated'
        DETERMINISTIC = 'DETERMINISTIC', 'Deterministic Rule-Based'
        MANUAL = 'MANUAL', 'Manual'

    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE,
                             related_name='reports')
    match = models.ForeignKey('matches.Match', on_delete=models.SET_NULL,
                              null=True, blank=True, related_name='reports')
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL,
                                     on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=250)
    executive_summary = models.TextField(blank=True)
    findings = models.JSONField(default=list, blank=True,
                                help_text='List of finding objects with evidence citations')
    recommendations = models.JSONField(default=list, blank=True)
    generation_mode = models.CharField(max_length=15, choices=GenerationMode.choices,
                                       default=GenerationMode.DETERMINISTIC)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'intelligence_analysisreport'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.generation_mode}] {self.title}"
