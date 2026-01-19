import { Redirect } from 'expo-router';

export default function Index() {
    // Redirect to onboarding welcome screen on app start
    return <Redirect href="/welcome" />;
}
