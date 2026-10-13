import { EmptyState } from '../components/ui'

export default function NotFoundPage() {
  return <EmptyState title="Page not found" action={{ to: '/', label: 'Back to sneakers' }}>The page you are looking for does not exist.</EmptyState>
}
