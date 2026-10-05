import { Redirect } from 'expo-router';
import { useSession } from '../src/session';
import { Loading } from '../src/components';
export default function Index() {
  const { ready, user } = useSession();
  if (!ready) return <Loading />;
  return <Redirect href={user ? '/projects' : '/sign-in'} />;
}
