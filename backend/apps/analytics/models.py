from django.db import models


class TacticalAnalysis(models.Model):
    """Computed tactical analysis for a team across matches."""

    class Scope(models.TextChoices):
        SINGLE_MATCH = 'SINGLE_MATCH', 'Single Match'
        MULTI_MATCH = 'MULTI_MATCH', 'Multi-Match Aggregate'
        SEASON = 'SEASON', 'Season Overview'

    match = models.ForeignKey('matches.Match', on_delete=models.CASCADE,
                              null=True, blank=True, related_name='analyses')
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE,
                             related_name='analyses')
    scope = models.CharField(max_length=15, choices=Scope.choices,
                             default=Scope.SINGLE_MATCH)
    sample_match_count = models.PositiveIntegerField(default=1)
    attacking_metrics = models.JSONField(default=dict, blank=True)
    defensive_metrics = models.JSONField(default=dict, blank=True)
    formation_metrics = models.JSONField(default=dict, blank=True)
    player_metrics = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'analytics_tacticalanalysis'
        ordering = ['-created_at']

    def __str__(self):
        return f"Analysis: {self.team.short_code} ({self.scope}) — {self.sample_match_count} matches"
