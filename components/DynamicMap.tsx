import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('./MapComponent'), {
ssr: false,
});

export default DynamicMap;