/**
 * @file components/inspector/Vector2Field.jsx
 * @description 二维向量输入（U/V 轴）字段，用于 UV 缩放/偏移。
 * @module components/inspector/Vector2Field
 */

/**
 * @param {Object} props
 * @param {string} props.label - 标签文本
 * @param {number[]|undefined} props.values - 当前向量值
 * @param {number[]} props.fallback - 缺省值
 * @param {(index: number, value: string) => void} props.onChange - 变化回调
 * @param {string} [props.step='0.1']
 * @param {string} [props.min]
 */
function Vector2Field({ label, values, fallback, onChange, step = '0.1', min }) {
  return (
    <div className="inspector-row">
      <label className="inspector-label">{label}</label>
      <div className="inspector-vector2">
        {['U', 'V'].map((axis, i) => (
          <div key={axis} className="vector-input">
            <span className="vector-label">{axis}</span>
            <input
              type="number"
              className="inspector-input"
              value={(values || fallback)[i]}
              onChange={(e) => onChange(i, e.target.value)}
              step={step}
              min={min}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Vector2Field;
