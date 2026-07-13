export type Vec3 = {
  x: number
  y: number
  z: number
}

export const vec3 = {
  create(x = 0, y = 0, z = 0): Vec3 {
    return { x, y, z }
  },

  clone(vector: Vec3): Vec3 {
    return { ...vector }
  },

  add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
  },

  subtract(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  },

  scale(vector: Vec3, scalar: number): Vec3 {
    return {
      x: vector.x * scalar,
      y: vector.y * scalar,
      z: vector.z * scalar,
    }
  },

  dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z
  },

  cross(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    }
  },

  length(vector: Vec3): number {
    return Math.hypot(vector.x, vector.y, vector.z)
  },

  lengthSquared(vector: Vec3): number {
    return vector.x ** 2 + vector.y ** 2 + vector.z ** 2
  },

  normalize(vector: Vec3): Vec3 {
    const magnitude = vec3.length(vector)
    if (magnitude === 0) {
      return vec3.create()
    }

    return vec3.scale(vector, 1 / magnitude)
  },
}
