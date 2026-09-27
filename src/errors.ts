/** 输入校验失败：HTTP 400，响应中必须交代原因 */
export class ValidationError extends Error {
  readonly status = 400;
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** 计算过程中出现非有限/非物理结果：HTTP 422 */
export class ComputationError extends Error {
  readonly status = 422;
  readonly code = 'COMPUTATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ComputationError';
  }
}

/** 引用的资源（如命名材料参数组）不存在：HTTP 404 */
export class NotFoundError extends Error {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
