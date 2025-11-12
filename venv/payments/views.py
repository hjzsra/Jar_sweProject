
# payments/views.py
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from decimal import Decimal
import json

from .services.pricing_engine import calculate_symbolic_fare
from .services.paypal_api import process_paypal_charge

@login_required
def cash_payment_view(request, trip_id):
    try:
        cost_details = calculate_symbolic_fare(0) 
        trip_cost_amount = cost_details 
    except Exception:
        trip_cost_amount = Decimal('0.00')

    context = {
        'trip_cost': f"{trip_cost_amount:.2f}",  
        'trip_id': trip_id
    }
    
    return render(request, 'payments/cash_payment.html', context)

@require_POST
def api_process_payment(request):
    try:
        data = json.loads(request.body)
        trip_id = data.get('trip_id')
        amount = data.get('amount')
        
        success, result = process_paypal_charge(trip_id, amount)

        if success:
            return JsonResponse({'status': 'success', 'details': result}, status=200)
        else:
            return JsonResponse({'status': 'failure', 'message': result}, status=400)
            
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)