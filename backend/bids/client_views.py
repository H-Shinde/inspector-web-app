import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from .forms import ClientForm
from .models import Client


def serialize_client(client):
    return {
        "id": client.pk,
        **{
            field: getattr(client, field)
            for field in ClientForm.Meta.fields
        },
    }


@require_http_methods(['GET', 'PATCH', 'DELETE'])
def client_detail(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    client = get_object_or_404(Client, pk=pk, owner=request.user)
    if request.method == 'DELETE':
        client.delete()
        return JsonResponse({'deleted': True})
    if request.method == 'GET':
        return JsonResponse(serialize_client(client))
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict) or set(data) - set(ClientForm.Meta.fields):
            raise ValueError('Provide valid client fields.')
    except (ValueError, UnicodeDecodeError) as error:
        return JsonResponse({'error': str(error)}, status=400)
    values = {field: getattr(client, field) for field in ClientForm.Meta.fields}
    form = ClientForm({**values, **data}, instance=client)
    if not form.is_valid():
        errors = {field: list(messages) for field, messages in form.errors.items()}
        return JsonResponse({'error': ' '.join(f'{field}: {message}' for field, messages in errors.items() for message in messages), 'errors': errors}, status=400)
    return JsonResponse(serialize_client(form.save()))


@require_http_methods(["GET", "POST"])
def clients(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Sign in required."},
            status=401,
        )

    if request.method == "GET":
        records = Client.objects.filter(
            owner=request.user,
        ).order_by("name", "id")

        return JsonResponse({
            "clients": [serialize_client(client) for client in records],
        })

    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid request."}, status=400)

    form = ClientForm(data)

    if not form.is_valid():
        errors = {
            field: [str(message) for message in messages]
            for field, messages in form.errors.items()
        }
        return JsonResponse({
            "error": " ".join(
                f"{field}: {message}"
                for field, messages in errors.items()
                for message in messages
            ),
            "errors": errors,
        }, status=400)

    client = form.save(commit=False)
    client.owner = request.user
    client.save()

    return JsonResponse(serialize_client(client), status=201)
