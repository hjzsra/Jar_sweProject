from decimal import Decimal
from django.db import transaction
from trips.models import Trip
from .models import Payment, CostShare, PaymentStatus, PaymentMethod

SYMBOLIC_FARE = Decimal('5.00')
DEFAULT_FARE = Decimal('20.00')

def calculate_trip_cost(trip: Trip) -> Decimal:
    if getattr(trip, 'is_student_driver', False):
        return SYMBOLIC_FARE
    if hasattr(trip, 'total_cost') and trip.total_cost:
        return Decimal(str(trip.total_cost))
    return DEFAULT_FARE


@transaction.atomic
def get_or_create_payment(trip: Trip) -> Payment:
    payment, created = Payment.objects.get_or_create(
        trip=trip,
        defaults={
            'total_amount': calculate_trip_cost(trip),
            'is_symbolic_fare': getattr(trip, 'is_student_driver', False),
        }
    )

    if created:
        passengers_qs = getattr(trip, 'passengers', None)
        if passengers_qs is not None and hasattr(passengers_qs, 'all') and passengers_qs.exists():
            passengers = list(passengers_qs.all())
        else:
            passenger = getattr(trip, 'passenger', None)
            passengers = [passenger] if passenger else []

        if passengers:
            share = (payment.total_amount / len(passengers)).quantize(Decimal('0.01'))
            for p in passengers:
                CostShare.objects.create(
                    payment=payment,
                    passenger=p,
                    amount=share
                )

    return payment


def mark_paid(payment: Payment, method: str):
    if method not in dict(PaymentMethod.choices):
        raise ValueError("Invalid payment method")

    payment.method = method
    payment.status = PaymentStatus.PAID
    payment.save()
    payment.shares.update(is_paid=True)


def simulate_online_payment(payment: Payment) -> bool:
    return payment.total_amount > 0

@transaction.atomic
def recalculate_cost_shares(payment: Payment):
    unpaid_shares = payment.shares.filter(is_paid=False)
    count = unpaid_shares.count()
    if count <= 0:
        return
    new_share = (payment.total_amount / count).quantize(Decimal('0.01'))
    for share in unpaid_shares:
        share.amount = new_share
    share.save()
