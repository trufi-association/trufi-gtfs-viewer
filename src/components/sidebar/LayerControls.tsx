import { useUiStore } from '../../store/uiStore'

export function LayerControls() {
  const { layerVisibility, setLayerVisibility } = useUiStore()

  const layers = [
    { key: 'shapes' as const, label: 'Routes/Shapes', color: 'bg-blue-500' },
    { key: 'stops' as const, label: 'Stops', color: 'bg-red-500' },
    { key: 'vehicles' as const, label: 'Vehicles', color: 'bg-green-500' },
  ]

  return (
    <div className="p-4 border-b border-gray-200">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Layers</h3>
      <div className="space-y-2">
        {layers.map(({ key, label, color }) => (
          <label
            key={key}
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 rounded"
          >
            <input
              type="checkbox"
              checked={layerVisibility[key]}
              onChange={(e) => setLayerVisibility(key, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-sm text-gray-600">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default LayerControls
