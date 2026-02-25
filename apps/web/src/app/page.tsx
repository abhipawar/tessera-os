import { redirect } from 'next/navigation';

export default function Home() {
  // Instantly routes the user to the Dashboard on load
  redirect('/dashboard');
}