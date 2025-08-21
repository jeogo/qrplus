import client from 'prom-client'

// Singleton registry
export const registry = new client.Registry()

export const orderStatusTransitionCounter = new client.Counter({
  name: 'orders_status_transition_total',
  help: 'Count of order status transitions',
  labelNames: ['from','to','role'] as const
})

export const routeLatencyHistogram = new client.Histogram({
  name: 'route_latency_ms',
  help: 'API route latency milliseconds',
  buckets: [25,50,100,200,400,800,1600],
  labelNames: ['route','method'] as const
})

export const routeErrorCounter = new client.Counter({
  name: 'orders_api_errors_total',
  help: 'API errors by route and code',
  labelNames: ['route','code'] as const
})

export const pushBatchesCounter = new client.Counter({
  name: 'push_batches_total',
  help: 'Number of push notification batch send operations',
  labelNames: ['kind'] as const
})

export const pushTokensCounter = new client.Counter({
  name: 'push_tokens_total',
  help: 'Total tokens attempted for push sends',
  labelNames: ['kind'] as const
})

export const pushFailedBatchesCounter = new client.Counter({
  name: 'push_failed_batches_total',
  help: 'Failed push batches',
  labelNames: ['kind'] as const
})

registry.registerMetric(orderStatusTransitionCounter)
registry.registerMetric(routeLatencyHistogram)
registry.registerMetric(routeErrorCounter)
registry.registerMetric(pushBatchesCounter)
registry.registerMetric(pushTokensCounter)
registry.registerMetric(pushFailedBatchesCounter)

export async function metricsSnapshot(){
  return registry.metrics()
}

interface ErrorLike { code?: string; [k:string]: unknown }
export async function withRouteMetrics<T>(route: string, method: string, fn: () => Promise<T>): Promise<T> {
  const end = routeLatencyHistogram.startTimer({ route, method })
  try {
    const res = await fn()
    end()
    return res
  } catch (e: unknown) {
    end()
    const code = typeof (e as ErrorLike)?.code === 'string' ? (e as ErrorLike).code! : 'ERROR'
    routeErrorCounter.inc({ route, code })
    throw e
  }
}
