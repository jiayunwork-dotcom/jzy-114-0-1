import type { MaterialParams } from './types';

/**
 * 命名材料参数组的存取（进程内存，重启即失，按需求不做持久化）。
 *
 * 隔离性约定：
 * - 存入时深拷贝，调用方之后改动自己的对象不影响仓库；
 * - 取出时深拷贝，调用方改动返回值不会污染仓库；
 * - 计算全程使用纯函数，不持有跨请求的可变状态，
 *   因此两组材料参数同时计算时，各自的中间结果彼此隔离。
 */
const materials = new Map<string, MaterialParams>();

export function saveMaterial(name: string, params: MaterialParams): void {
  materials.set(name, structuredClone(params));
}

export function getMaterial(name: string): MaterialParams | undefined {
  const found = materials.get(name);
  return found ? structuredClone(found) : undefined;
}

export function listMaterials(): string[] {
  return [...materials.keys()].sort();
}

export function deleteMaterial(name: string): boolean {
  return materials.delete(name);
}

/** 仅供测试清空仓库 */
export function clearMaterials(): void {
  materials.clear();
}
