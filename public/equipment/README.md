# Equipment Sprites

Place equipment PNG sprites here with transparency.
Size: 256x256px recommended.

## Structure

```
/equipment/
  /head/
    helmet-basic.png
    helmet-warrior.png
    crown-phoenix.png
  /body/
    armor-leather.png
    armor-iron.png
    armor-dragon.png
    robe-phoenix.png
  /accessory/
    cape-simple.png
    shield-basic.png
    wings-phoenix.png
```

## Sprite Guidelines

1. **Transparency**: Use PNG with alpha channel
2. **Size**: 256x256 pixels recommended
3. **Position**: Center the item in the image
4. **Style**: Match the pixel-art style of DiceBear avatars
5. **Layers**: Sprites will be layered with z-index:
   - Base Avatar: z-10
   - Body Equipment: z-20
   - Head Equipment: z-30
   - Accessory: z-40

## Placeholder Image

For development, a placeholder.png should be created at:
`/equipment/placeholder.png`

This is shown when a sprite fails to load.

## Adding New Items

1. Create the sprite PNG following guidelines above
2. Add to appropriate folder (head/body/accessory)
3. Add database entry in equipment_items table
4. Test layering with LayeredAvatar component
