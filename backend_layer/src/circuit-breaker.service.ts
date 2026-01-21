import { Injectable, Logger } from '@nestjs/common';

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold = 5; // Number of failures before opening circuit
  private readonly recoveryTimeout = 60000; // 1 minute before trying again
  private readonly successThreshold = 3; // Number of successes needed to close circuit

  private getCircuit(key: string): CircuitBreakerState {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
      });
    }
    return this.circuits.get(key)!;
  }

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    fallback?: () => T,
  ): Promise<T> {
    const circuit = this.getCircuit(key);

    // Check if circuit is open
    if (circuit.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - circuit.lastFailureTime;
      if (timeSinceLastFailure < this.recoveryTimeout) {
        this.logger.warn(`Circuit breaker OPEN for ${key}, using fallback`);
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${key}`);
      } else {
        // Move to half-open state
        circuit.state = 'HALF_OPEN';
        this.logger.log(`Circuit breaker HALF_OPEN for ${key}, testing connection`);
      }
    }

    try {
      const result = await operation();

      // Success - reset circuit
      if (circuit.state === 'HALF_OPEN') {
        circuit.failures = 0;
        circuit.state = 'CLOSED';
        this.logger.log(`Circuit breaker CLOSED for ${key} after successful test`);
      } else if (circuit.failures > 0) {
        circuit.failures = Math.max(0, circuit.failures - 1); // Gradually reduce failure count
      }

      return result;
    } catch (error) {
      circuit.failures++;
      circuit.lastFailureTime = Date.now();

      if (circuit.state === 'HALF_OPEN') {
        // Failed during half-open, go back to open
        circuit.state = 'OPEN';
        this.logger.warn(`Circuit breaker back to OPEN for ${key} after failed test`);
      } else if (circuit.failures >= this.failureThreshold) {
        circuit.state = 'OPEN';
        this.logger.error(`Circuit breaker OPEN for ${key} after ${circuit.failures} failures`);
      }

      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  getCircuitState(key: string): CircuitBreakerState {
    return this.getCircuit(key);
  }

  resetCircuit(key: string): void {
    this.circuits.delete(key);
    this.logger.log(`Circuit breaker reset for ${key}`);
  }
}