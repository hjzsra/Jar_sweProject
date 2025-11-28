'use client'

const TrackRide = ({ ride }: { ride: any }) => {
    const driver = ride.driver;

    return (
        <div className="card">
        <h2 className="text-2xl font-bold mb-4">Ride in Progress</h2>
        <p className="mb-4">Your ride is currently: <span className="font-bold">{ride.status}</span></p>

        {driver && (
            <div className="mb-4 p-4 border rounded-lg">
            <h3 className="text-lg font-bold">Driver Information</h3>
            <p>Name: {driver.firstName} {driver.lastName}</p>
            <p>Rating: {driver.rating?.toFixed(1)} ★</p>
            <div className="mt-2">
                <h4 className="font-semibold">Car Details</h4>
                <p>Plate: {driver.car.plateNumber}</p>
                <p>Color: {driver.car.color}</p>
                <p>Type: {driver.car.type}</p>
            </div>
            </div>
        )}

        <div className="mb-4">
            <h3 className="text-lg font-bold">Map</h3>
            <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">[Map placeholder showing driver location and route]</p>
            </div>
            {driver?.currentLat && (
                <p className="text-xs text-gray-500">Driver location: {driver.currentLat}, {driver.currentLng}</p>
            )}
        </div>

        <div className="mt-2">
            <h4 className="font-bold">Other Passengers:</h4>
            <ul className="list-disc list-inside">
                {ride.passengers.map((p: any) => (
                <li key={p.id} className="text-sm">{p.user.firstName} {p.user.lastName}</li>
                ))}
            </ul>
            </div>
        </div>
    );
};

export default TrackRide;