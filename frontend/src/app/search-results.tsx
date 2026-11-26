import { useLocalSearchParams } from 'expo-router';
import SearchScreen from '../components/search-screen';

export default function SearchResultsRoute() {
  const { query } = useLocalSearchParams<{ query?: string }>();
  const term = typeof query === 'string' ? query.trim() : '';
  return <SearchScreen key={term} query={term} />;
}
