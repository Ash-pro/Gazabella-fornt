import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { gazabellaApi } from '../../api/gazabella'
import { Icon } from '../ui/Icon'
export function Footer() {
  const {data:categories} = useQuery({queryKey:['categories'],queryFn:gazabellaApi.getCategories})
  return <footer className="site-footer"><div className="container-page footer-grid"><div><Link to="/" className="footer-brand">Gazabella</Link><p>الجمال أقرب إليكِ.<br />منتجات من متاجر مختارة، نجمعها لكِ في تجربة واحدة وتوصيل موحّد في خانيونس.</p></div><div><h2>اكتشفي الأقسام</h2><div className="footer-links">{categories?.map((c)=><Link key={c.id} to={`/?category=${c.slug}#products`}>{c.name}</Link>)}</div></div><div><h2>تجربتكِ مع Gazabella</h2><Link to="/orders">حسابي وطلباتي</Link><Link to="/cart">سلة التسوق</Link><p className="flex items-center gap-2"><Icon name="truck" className="size-4" /> التوصيل في خانيونس</p><p className="flex items-center gap-2"><Icon name="shield" className="size-4" /> تفاصيل الدفع واضحة قبل التأكيد</p></div></div><div className="container-page footer-bottom"><span>© {new Date().getFullYear()} Gazabella</span><span>من خانيونس، بكل حب.</span></div></footer>
}
