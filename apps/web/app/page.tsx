import { WebWorkspace } from './web-workspace';
export default function Page() {
  return <WebWorkspace apiBaseUrl={process.env.NEXT_PUBLIC_API_BASE_URL!} />;
}
