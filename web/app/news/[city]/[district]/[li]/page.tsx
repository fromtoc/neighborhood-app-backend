import { redirect } from 'next/navigation';

interface Props {
  params: { city: string; district: string; li: string };
}

export default function NewsLiRedirect({ params }: Props) {
  redirect(`/${params.city}/${params.district}/${params.li}?tab=info`);
}
