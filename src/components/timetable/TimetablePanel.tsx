import StopTimesList from './StopTimesList'
import { useGtfsStore } from '../../store/gtfsStore'

export function TimetablePanel() {
  const { feedStats } = useGtfsStore()

  if (!feedStats) return null

  return (
    <div className="border-t border-gray-200">
      <StopTimesList />
    </div>
  )
}

export default TimetablePanel
