
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



    from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpRequest
from django.contrib.auth.decorators import login_required
from .models import Order

@login_required
def select_payment_method(request: HttpRequest, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user, status='PENDING')
    
    if request.method == 'POST':
        selected_method = request.POST.get('payment_method')
        
        if selected_method in ['CARD', 'CASH', 'APPLE_PAY', 'JAR']:
            order.selected_payment_method = selected_method
            order.save()
            
            if selected_method == 'CASH':
                return redirect('order_confirmation', order_id=order.id)
            
            elif selected_method in ['CARD', 'APPLE_PAY', 'JAR']:
                return redirect('initiate_payment_process', order_id=order.id)
        
        return render(request, 'payment_select.html', {'order': order, 'error': 'Invalid payment method.'})

    return render(request, 'payment_select.html', {'order': order})

@login_required
def order_confirmation(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, 'order_confirmation.html', {'order': order})

@login_required
def initiate_payment_process(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, 'payment_initiate.html', {'order': order})