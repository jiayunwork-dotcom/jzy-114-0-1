/**
 * 输入校验失败：在任何数值计算开始之前抛出，
 * 由接口层转换为带原因的 400 错误响应。
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    /** 出错字段，便于调用方定位 */
    readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** 命名资源不存在 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
