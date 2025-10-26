/**
 * 環形緩衝區（Ring Buffer）
 * 用於存儲固定數量的最新消息，自動覆蓋舊數據
 */

export class RingBuffer<T> {
    private buffer: T[]
    private capacity: number
    private writeIndex: number
    private size: number

    constructor(capacity: number) {
        this.capacity = capacity
        this.buffer = new Array(capacity)
        this.writeIndex = 0
        this.size = 0
    }

    /**
     * 添加新元素到緩衝區
     */
    push(item: T): void {
        this.buffer[this.writeIndex] = item
        this.writeIndex = (this.writeIndex + 1) % this.capacity

        if (this.size < this.capacity) {
            this.size++
        }
    }

    /**
     * 獲取所有元素（按時間順序，最新的在前）
     */
    getAll(): T[] {
        if (this.size === 0) return []

        const result: T[] = []

        // 如果緩衝區未滿
        if (this.size < this.capacity) {
            // 從最新寫入位置往前讀取
            for (let i = this.writeIndex - 1; i >= 0; i--) {
                result.push(this.buffer[i])
            }
        } else {
            // 緩衝區已滿，需要分兩段讀取
            // 第一段：從 writeIndex-1 到 0
            for (let i = this.writeIndex - 1; i >= 0; i--) {
                result.push(this.buffer[i])
            }
            // 第二段：從 capacity-1 到 writeIndex
            for (let i = this.capacity - 1; i >= this.writeIndex; i--) {
                result.push(this.buffer[i])
            }
        }

        return result
    }

    /**
     * 獲取最近 n 個元素
     */
    getRecent(n: number): T[] {
        return this.getAll().slice(0, Math.min(n, this.size))
    }

    /**
     * 根據條件過濾元素
     */
    filter(predicate: (item: T) => boolean): T[] {
        return this.getAll().filter(predicate)
    }

    /**
     * 清空緩衝區
     */
    clear(): void {
        this.buffer = new Array(this.capacity)
        this.writeIndex = 0
        this.size = 0
    }

    /**
     * 獲取當前大小
     */
    getSize(): number {
        return this.size
    }

    /**
     * 獲取容量
     */
    getCapacity(): number {
        return this.capacity
    }

    /**
     * 檢查是否為空
     */
    isEmpty(): boolean {
        return this.size === 0
    }

    /**
     * 檢查是否已滿
     */
    isFull(): boolean {
        return this.size === this.capacity
    }

    /**
     * 獲取最新的元素
     */
    getLatest(): T | null {
        if (this.size === 0) return null

        const latestIndex = this.writeIndex === 0
            ? this.capacity - 1
            : this.writeIndex - 1

        return this.buffer[latestIndex]
    }

    /**
     * 獲取最舊的元素
     */
    getOldest(): T | null {
        if (this.size === 0) return null

        if (this.size < this.capacity) {
            return this.buffer[0]
        } else {
            return this.buffer[this.writeIndex]
        }
    }
}


