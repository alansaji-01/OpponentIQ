from django.db import models


class Match(models.Model):
    """A single football match."""

    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        LIVE = 'LIVE', 'Live'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    home_team = models.ForeignKey('teams.Team', on_delete=models.CASCADE,
                                  related_name='home_matches')
    away_team = models.ForeignKey('teams.Team', on_delete=models.CASCADE,
                                  related_name='away_matches')
    match_date = models.DateTimeField()
    competition = models.CharField(max_length=120, blank=True)
    home_score = models.PositiveSmallIntegerField(default=0)
    away_score = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices,
                              default=Status.SCHEDULED)
    venue = models.CharField(max_length=150, blank=True)
    is_demo_data = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'matches_match'
        ordering = ['-match_date']

    def __str__(self):
        return (f"{self.home_team.short_code} {self.home_score}-{self.away_score} "
                f"{self.away_team.short_code} ({self.match_date:%Y-%m-%d})")


class MatchTeam(models.Model):
    """Per-team aggregates for a match."""

    match = models.ForeignKey(Match, on_delete=models.CASCADE,
                              related_name='match_teams')
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE)
    is_home = models.BooleanField()
    formation_used = models.CharField(max_length=20, blank=True)
    possession_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ppda = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                               help_text='Passes Per Defensive Action')
    shots = models.PositiveSmallIntegerField(default=0)
    shots_on_target = models.PositiveSmallIntegerField(default=0)
    passes_completed = models.PositiveSmallIntegerField(default=0)
    passes_attempted = models.PositiveSmallIntegerField(default=0)
    tackles = models.PositiveSmallIntegerField(default=0)
    interceptions = models.PositiveSmallIntegerField(default=0)
    fouls = models.PositiveSmallIntegerField(default=0)
    corners = models.PositiveSmallIntegerField(default=0)
    offsides = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'matches_matchteam'
        unique_together = [('match', 'team')]

    def __str__(self):
        side = 'H' if self.is_home else 'A'
        return f"{self.team.short_code} ({side}) — Match #{self.match_id}"


class MatchEvent(models.Model):
    """Granular in-match event."""

    class EventType(models.TextChoices):
        PASS = 'PASS', 'Pass'
        SHOT = 'SHOT', 'Shot'
        GOAL = 'GOAL', 'Goal'
        TACKLE = 'TACKLE', 'Tackle'
        INTERCEPTION = 'INTERCEPTION', 'Interception'
        FOUL = 'FOUL', 'Foul'
        CORNER = 'CORNER', 'Corner'
        TURNOVER = 'TURNOVER', 'Turnover'
        POSSESSION_CHANGE = 'POSSESSION_CHANGE', 'Possession Change'
        DRIBBLE = 'DRIBBLE', 'Dribble'
        CROSS = 'CROSS', 'Cross'
        FREE_KICK = 'FREE_KICK', 'Free Kick'
        YELLOW_CARD = 'YELLOW_CARD', 'Yellow Card'
        RED_CARD = 'RED_CARD', 'Red Card'
        SUBSTITUTION = 'SUBSTITUTION', 'Substitution'

    class Outcome(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        FAIL = 'FAIL', 'Fail'
        BLOCKED = 'BLOCKED', 'Blocked'
        SAVED = 'SAVED', 'Saved'
        OFF_TARGET = 'OFF_TARGET', 'Off Target'
        GOAL = 'GOAL', 'Goal'

    match = models.ForeignKey(Match, on_delete=models.CASCADE,
                              related_name='events')
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE)
    player = models.ForeignKey('teams.Player', on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='events')
    recipient_player = models.ForeignKey('teams.Player', on_delete=models.SET_NULL,
                                         null=True, blank=True,
                                         related_name='received_events')
    period = models.PositiveSmallIntegerField(default=1,
                                              help_text='1=first half, 2=second half, 3=ET1, 4=ET2')
    minute = models.PositiveSmallIntegerField()
    second = models.PositiveSmallIntegerField(default=0)
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    outcome = models.CharField(max_length=12, choices=Outcome.choices,
                               default=Outcome.SUCCESS)
    start_x = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True,
                                  help_text='Pitch x coord 0–100')
    start_y = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True,
                                  help_text='Pitch y coord 0–100')
    end_x = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    end_y = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    under_pressure = models.BooleanField(default=False)
    xg_value = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True,
                                   help_text='Expected goals value for shots')

    class Meta:
        db_table = 'matches_matchevent'
        ordering = ['match', 'period', 'minute', 'second']
        indexes = [
            models.Index(fields=['match', 'event_type']),
            models.Index(fields=['team', 'event_type']),
            models.Index(fields=['player', 'event_type']),
        ]

    def __str__(self):
        return f"{self.minute}' {self.event_type} — {self.player or 'Unknown'}"
