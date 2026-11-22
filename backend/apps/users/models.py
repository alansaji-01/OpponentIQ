from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user with RBAC role and organisation."""

    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        HEAD_COACH = 'HEAD_COACH', 'Head Coach'
        ANALYST = 'ANALYST', 'Analyst'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.ANALYST)
    organization = models.CharField(max_length=120, blank=True)

    class Meta:
        db_table = 'users_user'

    def __str__(self):
        return f"{self.username} ({self.role})"
