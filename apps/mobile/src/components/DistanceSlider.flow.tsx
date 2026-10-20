import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {DistanceSlider} from './DistanceSlider';
vi.mock('../theme',()=>({fonts:{medium:'sans-serif'},useTheme:()=>({colours:{primary:'#43c58a',muted:'#aebbb1',text:'#edf4ee'}})}));
vi.mock('../haptics',()=>({ctaHaptic:vi.fn()}));
afterEach(cleanup);
it('previews while dragging and applies only on release',()=>{
 const commit=vi.fn();render(<DistanceSlider value={25} onCommit={commit}/>);
 fireEvent.change(screen.getByRole('slider'),{target:{value:'12'}});
 expect(commit).not.toHaveBeenCalled();expect(screen.getByText('12 km')).toBeTruthy();
 fireEvent.pointerUp(screen.getByRole('slider'));
 expect(commit).toHaveBeenCalledOnce();expect(commit).toHaveBeenCalledWith(12);
 fireEvent.blur(screen.getByRole('slider'));expect(commit).toHaveBeenCalledOnce();
});
