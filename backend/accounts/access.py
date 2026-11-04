from django.http import JsonResponse


class AdminAppAccessMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        admin_api = any(request.path.startswith(prefix) for prefix in [
            '/api/bids/', '/api/jobs/', '/api/clients/', '/api/inspectors/', '/api/bid-settings/',
        ])
        if admin_api and request.user.is_authenticated and request.user.email.casefold() != 'admin@email.com':
            return JsonResponse({'error': 'Admin access required.'}, status=403)
        if request.path.startswith('/admin/') and request.user.is_authenticated and request.user.email.casefold() != 'admin@email.com':
            return JsonResponse({'error': 'Admin access required.'}, status=403)
        return self.get_response(request)
