# Downloads demo-only images (Pexels licence: free use, no attribution required) into public/demo/.
# Used only when VITE_DEMO_FIXTURES=true. Remove public/demo before launch (L-07).
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '..\public\demo'
$items = @(
  @('products/aurelia-brightening-serum-1',30229018,800,1000), @('products/aurelia-brightening-serum-2',30229019,800,1000),
  @('products/gaza-glow-eyeshadow-palette-1',5403545,800,1000), @('products/gaza-glow-eyeshadow-palette-2',2113855,800,1000),
  @('products/velvet-rose-perfume-oil-50ml-1',4041391,800,1000), @('products/velvet-rose-perfume-oil-50ml-2',4041392,800,1000),
  @('products/shea-butter-hand-nail-cream-1',8140905,800,1000), @('products/shea-butter-hand-nail-cream-2',8140899,800,1000),
  @('products/rose-quartz-gua-sha-stone-1',6963143,800,1000), @('products/rose-quartz-gua-sha-stone-2',8015877,800,1000),
  @('products/bridal-veil-perfume-gift-set-1',4041394,800,1000), @('products/bridal-veil-perfume-gift-set-2',5704738,800,1000),
  @('products/rosewater-facial-toner-1',6621461,800,1000), @('products/rosewater-facial-toner-2',8166568,800,1000),
  @('products/silk-setting-powder-1',1499517,800,1000), @('products/silk-setting-powder-2',7256160,800,1000),
  @('products/aurora-eau-de-parfum-1',16722498,800,1000), @('products/aurora-eau-de-parfum-2',16722499,800,1000),
  @('products/bamboo-makeup-brush-set-12pc-1',4620873,800,1000), @('products/bamboo-makeup-brush-set-12pc-2',1830447,800,1000),
  @('products/gazabella-bridal-gift-box-1',4397903,800,1000), @('products/gazabella-bridal-gift-box-2',5725881,800,1000),
  @('products/hyaluronic-acid-serum-1',8140898,800,1000), @('products/hyaluronic-acid-serum-2',30229020,800,1000),
  @('products/volumizing-mascara-waterproof-1',3762663,800,1000), @('products/volumizing-mascara-waterproof-2',3762664,800,1000),
  @('products/amber-musk-solid-perfume-1',30229021,800,1000), @('products/amber-musk-solid-perfume-2',6621462,800,1000),
  @('products/precision-brow-definer-duo-1',5240248,800,1000), @('products/precision-brow-definer-duo-2',5240249,800,1000),
  @('categories/beauty-tools',2721977,600,600), @('categories/natural-care',6621467,600,600),
  @('categories/bride',28795942,600,600), @('categories/makeup',1339340,600,600),
  @('categories/perfumes',16722500,600,600), @('categories/skincare',8140902,600,600),
  @('banners/hero',4041385,1600,900), @('banners/promo',26811050,1200,900),
  @('collections/everyday-edit',15191189,1200,900),
  @('guides/oily-skin-routine',8140903,1200,675), @('guides/choose-your-perfume',16722501,1200,675),
  @('guides/bridal-prep-checklist',4041395,1200,675)
)
foreach ($i in $items) {
  $out = Join-Path $root ($i[0] + '.webp')
  New-Item -ItemType Directory -Force -Path (Split-Path $out) | Out-Null
  $url = "https://images.pexels.com/photos/$($i[1])/pexels-photo-$($i[1]).jpeg?auto=compress&cs=tinysrgb&fm=webp&fit=crop&w=$($i[2])&h=$($i[3])"
  curl.exe -sSL -f -o $out $url
  "{0,-48} {1,7}" -f $i[0], (Get-Item $out).Length
}
