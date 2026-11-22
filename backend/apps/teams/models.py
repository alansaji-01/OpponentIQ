from django.db import models


class Team(models.Model):
    """Football team / opponent."""

    class PressingStyle(models.TextChoices):
        HIGH = 'HIGH', 'High Press'
        MID = 'MID', 'Mid Block'
        LOW = 'LOW', 'Low Block'
        MIXED = 'MIXED', 'Mixed'

    name = models.CharField(max_length=120, unique=True)
    short_code = models.CharField(max_length=5, unique=True)
    logo = models.ImageField(upload_to='team_logos/', blank=True, null=True)
    primary_color = models.CharField(max_length=7, default='#10B981',
                                     help_text='Hex colour e.g. #10B981')
    default_formation = models.CharField(max_length=20, default='4-3-3')
    pressing_style = models.CharField(max_length=10, choices=PressingStyle.choices,
                                      default=PressingStyle.MID)
    is_demo_data = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teams_team'
        ordering = ['name']

    def __str__(self):
        return f"{self.short_code} — {self.name}"


class Player(models.Model):
    """Player belonging to a team."""

    class Position(models.TextChoices):
        GK = 'GK', 'Goalkeeper'
        CB = 'CB', 'Centre-Back'
        LB = 'LB', 'Left-Back'
        RB = 'RB', 'Right-Back'
        CDM = 'CDM', 'Defensive Midfielder'
        CM = 'CM', 'Central Midfielder'
        CAM = 'CAM', 'Attacking Midfielder'
        LW = 'LW', 'Left Winger'
        RW = 'RW', 'Right Winger'
        ST = 'ST', 'Striker'
        CF = 'CF', 'Centre-Forward'

    class Foot(models.TextChoices):
        LEFT = 'LEFT', 'Left'
        RIGHT = 'RIGHT', 'Right'
        BOTH = 'BOTH', 'Both'

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='players')
    full_name = models.CharField(max_length=150)
    jersey_number = models.PositiveSmallIntegerField()
    primary_position = models.CharField(max_length=5, choices=Position.choices)
    preferred_foot = models.CharField(max_length=5, choices=Foot.choices,
                                      default=Foot.RIGHT)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'teams_player'
        ordering = ['jersey_number']
        unique_together = [('team', 'jersey_number')]

    def __str__(self):
        return f"#{self.jersey_number} {self.full_name} ({self.team.short_code})"
