import { IconArrowUpRight } from './statusIcons';
import s from './LinkArrow.module.css';

export const linkArrowHost = s.host;

export function LinkArrow() {
    return <IconArrowUpRight className={s.arrow} />;
}
