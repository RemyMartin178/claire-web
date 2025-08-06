export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
  userId?: string;
}

export interface ErrorLog {
  error: string;
  code?: string;
  operation: string;
  userId?: string;
  timestamp: number;
  details?: any;
}

class MonitoringService {
  private static instance: MonitoringService;
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorLog[] = [];
  private readonly MAX_LOGS = 1000;

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  logPerformance(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);
    
    if (this.metrics.length > this.MAX_LOGS) {
      this.metrics = this.metrics.slice(-this.MAX_LOGS);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${metric.operation} - ${metric.duration}ms - ${metric.success ? '✅' : '❌'}`);
    }
  }

  logError(error: Omit<ErrorLog, 'timestamp'>): void {
    const fullError: ErrorLog = {
      ...error,
      timestamp: Date.now()
    };

    this.errors.push(fullError);
    
    if (this.errors.length > this.MAX_LOGS) {
      this.errors = this.errors.slice(-this.MAX_LOGS);
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(`🚨 Error: ${error.operation} - ${error.error}`, error.details);
    }
  }

  getPerformanceMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  getErrorLogs(operation?: string): ErrorLog[] {
    if (operation) {
      return this.errors.filter(e => e.operation === operation);
    }
    return [...this.errors];
  }

  getAveragePerformance(operation: string): number {
    const metrics = this.getPerformanceMetrics(operation);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  getSuccessRate(operation: string): number {
    const metrics = this.getPerformanceMetrics(operation);
    if (metrics.length === 0) return 0;
    
    const successful = metrics.filter(m => m.success).length;
    return (successful / metrics.length) * 100;
  }

  clearLogs(): void {
    this.metrics = [];
    this.errors = [];
  }

  exportLogs(): { metrics: PerformanceMetric[], errors: ErrorLog[] } {
    return {
      metrics: [...this.metrics],
      errors: [...this.errors]
    };
  }
}

export const monitoring = MonitoringService.getInstance();

export const withPerformanceTracking = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (err: any) {
      error = err.message || 'Unknown error';
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      monitoring.logPerformance({
        operation,
        duration,
        success,
        error
      });
    }
  };
};

export const withErrorHandling = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      monitoring.logError({
        error: error.message || 'Unknown error',
        code: error.code,
        operation,
        details: error
      });
      throw error;
    }
  };
};

export const trackUserOperation = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const result = await fn(...args);
      success = true;
      return result;
    } catch (err: any) {
      error = err.message || 'Unknown error';
      monitoring.logError({
        error: err.message || 'Unknown error',
        code: err.code,
        operation,
        details: err
      });
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      monitoring.logPerformance({
        operation,
        duration,
        success,
        error
      });
    }
  };
}; 