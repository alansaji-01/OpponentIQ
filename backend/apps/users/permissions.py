"""RBAC permissions for OpponentIQ."""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow only ADMIN role."""
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and request.user.role == 'ADMIN')


class IsHeadCoach(BasePermission):
    """Allow ADMIN or HEAD_COACH."""
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and request.user.role in ('ADMIN', 'HEAD_COACH'))


class IsAnalystOrAbove(BasePermission):
    """Allow any authenticated user with a valid role."""
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and request.user.role in ('ADMIN', 'HEAD_COACH', 'ANALYST'))


class ReadOnlyOrAdmin(BasePermission):
    """Read for any authenticated user; write only for ADMIN."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == 'ADMIN'
