// QA specimen only: served by Vite, never imported by the application.
import { createRoot } from 'react-dom/client'
import '/src/index.css'
import { Button } from '/src/components/ui/button'
import { Input } from '/src/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '/src/components/ui/select'
import { Badge } from '/src/components/ui/badge'
import { Card, CardContent } from '/src/components/ui/card'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '/src/components/ui/dialog'
import { Popover, PopoverTrigger, PopoverContent } from '/src/components/ui/popover'

const theme = new URLSearchParams(location.search).get('theme') || 'light'
document.documentElement.dataset.theme = theme
document.documentElement.classList.toggle('dark', theme === 'dark')

const typeScale = ['caption', 'small', 'body', 'body-lg', 'title', 'display', 'study']
const textClasses = ['text-caption', 'text-small', 'text-body', 'text-body-lg', 'text-title', 'text-display', 'text-study']

createRoot(document.getElementById('root')).render(
  <div className="flex flex-col gap-6 p-6">
    <h1 className="text-display">Memnova · {theme} · Nền tảng</h1>
    <div className="grid grid-cols-2 gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-title">Thang chữ</h2>
        {typeScale.map((token, i) => <p key={token} data-type={token} className={textClasses[i]}>{token} · Thư viện và gợi nhớ</p>)}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title">Điều khiển</h2>
        {(['sm', 'md', 'lg'] as const).map(size => <div key={size} className="flex items-center gap-2">
          <Button size={size} data-control={`button-${size}`}>{size}</Button>
          <Input controlSize={size} aria-label={`Input ${size}`} defaultValue="Ghi chú" data-control={`input-${size}`} className="w-40" />
          <Select defaultValue="note"><SelectTrigger size={size} aria-label={`Select ${size}`} data-control={`select-${size}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="note">Ghi chú</SelectItem><SelectItem value="cue">Gợi nhớ</SelectItem></SelectContent></Select>
        </div>)}
        <div className="flex gap-2">
          <Button variant="outline">Hành động phụ</Button><Button variant="ghost">Huỷ</Button><Button disabled>Disabled</Button>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Huy hiệu</Badge>
          <Dialog><DialogTrigger asChild><Button variant="outline">Mở dialog</Button></DialogTrigger><DialogContent><DialogTitle>Ghi chú</DialogTitle><DialogDescription>Mẫu kiểm tra bo góc và focus.</DialogDescription><Input aria-label="Tên ghi chú" /></DialogContent></Dialog>
          <Popover><PopoverTrigger asChild><Button variant="ghost">Mở popover</Button></PopoverTrigger><PopoverContent>Mẫu popover</PopoverContent></Popover>
        </div>
      </section>
    </div>
    <Card><CardContent className="flex flex-col gap-2">
      <p className="text-body text-text-primary">Primary · Nội dung ghi chú</p>
      <p className="text-body text-text-secondary">Secondary · Thuộc tính của trang</p>
      <p className="text-body text-text-muted">Muted · tương thích nhãn cũ trước khi dọn từng màn</p>
    </CardContent></Card>
  </div>
)
