from decimal import Decimal
from django.db import transaction
from django.core.mail import send_mail
from django.conf import settings
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


def simulate_online_payment(payment: Payment) -> bool:
    return payment.total_amount > 0



def mark_paid(payment: Payment, method: str):
    if method not in dict(PaymentMethod.choices):
        raise ValueError("Invalid payment method!")

    payment.method = method
    payment.status = PaymentStatus.PAID
    payment.save()
    payment.shares.update(is_paid=True)


def handle_payment_failure(payment: Payment):
    payment.status = PaymentStatus.FAILED
    payment.save()
    payment.shares.update(is_paid=False)


@transaction.atomic
def recalculate_cost_shares(payment: Payment):
    remaining_shares = payment.shares.filter(is_paid=False)
    count = remaining_shares.count()
    if count == 0:
        return
    new_share = (payment.total_amount / count).quantize(Decimal('0.01'))
    for share in remaining_shares:
        share.amount = new_share
        share.save()



def send_payment_receipts(payment: Payment):
    if payment.status != PaymentStatus.PAID:
        return

    subject = f"Trip Payment Receipt #{payment.id}"
    for share in payment.shares.select_related('passenger'):
        email = getattr(share.passenger, 'email', None)
        if not email:
            continue

        message = (
            f"Dear {share.passenger},\n\n"
            f"Your payment for trip #{payment.trip.id} has been confirmed.\n"
            f"Total trip cost: {payment.total_amount} {payment.currency}\n"
            f"Your share: {share.amount} {payment.currency}\n"
            f"Method:  {payment.method}\n "
            f"Status:  {payment.status}\n\n"
            f"Thank you."
        )

        send_mail(
            subject,
            message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@jar.com'),
            [email],
            fail_silently=True
        )
