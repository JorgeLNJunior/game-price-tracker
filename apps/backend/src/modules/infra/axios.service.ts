import axios, { type AxiosInstance, isAxiosError } from 'axios'
import { injectable } from 'tsyringe'

import { PinoLogger } from './pino.logger'

@injectable()
export class AxiosService {
  private readonly axiosInstance: AxiosInstance
  private readonly logger = new PinoLogger()

  constructor () {
    this.axiosInstance = axios.create()
    this.axiosInstance.interceptors.response.use(undefined, (error) => {
      if (isAxiosError(error)) {
        this.logger.error(
          error,
          `[AxiosService] request to "${error.config?.url ?? 'unknown'}" failed with code "${error.code ?? 'unknown'}"`)
      } else this.logger.error(error, '[AxiosService] request failed')
    })
  }

  async get <Response>(url: string, config?: RequestConfig): Promise<Response> {
    const response = await this.axiosInstance.get(url, config)
    return response.data
  }
}

interface RequestConfig {
  headers: Record<string, string>
}
