/**
 * 命名材料参数组的存取（运行期内存态，进程重启即清空，符合题目要求）。
 *
 * 隔离原则：
 * - 存入时做结构化克隆，取出时再克隆一次，调用方拿到的对象与库内对象互不共享引用，
 *   任何一次计算都改不到别的参数组头上；
 * - 两组参数同时在算，各自的速率常数/膜厚/质量增益只活在各自的局部变量里，
 *   不存在跨组共享状态。
 */
import { MaterialParameterSet } from './types';
import { ValidationError } from './errors';

function clone(set: MaterialParameterSet): MaterialParameterSet {
  return structuredClone(set);
}

/** 仅保留参数组允许出现的数值/字符串字段，忽略请求里夹带的其它键 */
const NUMERIC_FIELDS: (keyof MaterialParameterSet)[] = [
  'parabolicRateConstant',
  'linearRateConstant',
  'activationEnergy',
  'gasConstant',
  'referenceTemperature',
  'referenceOxygenPressure',
  'oxygenPressureExponent',
  'density',
  'pillingBedworthRatio'
];

export class MaterialStore {
  private readonly sets = new Map<string, MaterialParameterSet>();

  save(name: string, input: Partial<MaterialParameterSet>): MaterialParameterSet {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('参数组名称 name 必须是非空字符串', 'name');
    }
    const key = name.trim();

    const existing = this.sets.get(key);
    const record: MaterialParameterSet = {
      name: key,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };

    if (typeof input.description === 'string') {
      record.description = input.description;
    }
    if (typeof input.dense === 'boolean') {
      record.dense = input.dense;
    }

    for (const field of NUMERIC_FIELDS) {
      const v = (input as Record<string, unknown>)[field as string];
      if (v === undefined || v === null) continue;
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new ValidationError(`参数 ${field} 必须是有限数值，实际收到: ${String(v)}`, field);
      }
      (record as unknown as Record<string, unknown>)[field as string] = v;
    }

    this.sets.set(key, clone(record));
    return clone(record);
  }

  get(name: string): MaterialParameterSet | undefined {
    const found = this.sets.get(name);
    return found ? clone(found) : undefined;
  }

  list(): MaterialParameterSet[] {
    return [...this.sets.values()].map(clone);
  }

  delete(name: string): boolean {
    return this.sets.delete(name);
  }

  clear(): void {
    this.sets.clear();
  }
}
