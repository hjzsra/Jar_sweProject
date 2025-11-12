from rest_framework import permissions


class IsApprovedDriver(permissions.BasePermission):
   
    message = "Only approved drivers can access this endpoint"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        
        if not hasattr(request.user, 'user_type') or request.user.user_type != 'driver':
            return False
        
        
        if hasattr(request.user, 'driver_profile'):
            return request.user.driver_profile.is_verified and request.user.driver_profile.is_approved
        
        return False


class IsTripDriver(permissions.BasePermission):
    
    message = "Only the trip driver can perform this action"
    
    def has_object_permission(self, request, view, obj):
        
        return obj.driver == request.user


class IsTripParticipant(permissions.BasePermission):
   
    message = "Only trip participants can access this information"
    
    def has_object_permission(self, request, view, obj):
       
        is_driver = obj.driver == request.user
        is_passenger = obj.passengers.filter(id=request.user.id).exists()
        return is_driver or is_passenger


class IsPassenger(permissions.BasePermission):
  
    message = "Only passengers can access this endpoint"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        
        if hasattr(request.user, 'user_type'):
            return request.user.user_type == 'passenger' or request.user.user_type == 'both'
        
        return True  


class CanRateTrip(permissions.BasePermission):
   
    message = "You can only rate trips you participated in"
    
    def has_object_permission(self, request, view, obj):
        
        if obj.status != 'completed':
            return False
        
        is_driver = obj.driver == request.user
        is_passenger = obj.passengers.filter(id=request.user.id).exists()
        return is_driver or is_passenger


class IsDriverAvailable(permissions.BasePermission):
   
    message = "You must be available to create trips"
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if hasattr(request.user, 'driver_profile'):
            return request.user.driver_profile.is_available
        
        return False


class CanModifyTrip(permissions.BasePermission):
   
    message = "This trip cannot be modified"
    
    def has_object_permission(self, request, view, obj):
        
        if obj.driver != request.user:
            return False
        
        
        if obj.status not in ['pending', 'scheduled']:
            return False
        
        return True