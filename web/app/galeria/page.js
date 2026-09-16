'use client';
import { attrs, NESTED, REORDER } from '../ui';

const THUMBS = [1, 2, 3, 4, 5, 6, 7, 8];
const order = (arr) => (REORDER ? [...arr].reverse() : arr);

const Wrap = ({ children }) =>
  NESTED ? <div className="layer-a"><div className="layer-b">{children}</div></div>
         : <>{children}</>;

export default function Galeria() {
  return (
    <main>
      <h1>Galeria do produto</h1>
      <p className="sub">
        Miniaturas sem rotulo textual: so a posicao as distingue.
      </p>
      <div className="card">
        <Wrap>
          <div className="gal">
            {order(THUMBS).map((n) => (
              <button {...attrs(`thumb${n}`)} key={n} type="button" />
            ))}
          </div>
        </Wrap>
      </div>
    </main>
  );
}
