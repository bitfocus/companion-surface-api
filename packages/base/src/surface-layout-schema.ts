import z from 'zod'

/**
 * Single source of truth for the surface layout schema.
 *
 * A surface layout describes the default styling and the map of controls (with
 * positions and optional per-control style overrides) that a surface exposes.
 *
 * The generated JSON schema (`assets/surface-layout.schema.json`) and the
 * TypeScript types are both derived from these definitions, so there is only
 * ever one description of the layout to maintain.
 *
 * Unlike the manifest there is no strict/loose distinction here: a layout is
 * either structurally valid or it is not.
 */

const pixelFormatSchema = z
	.enum(['rgb', 'rgba', 'bgr', 'bgra'])
	.describe('Buffer pixel format')
	.meta({ id: 'SurfaceSchemaPixelFormat', title: 'SurfaceSchemaPixelFormat' })

const bitmapConfigSchema = z
	.object({
		w: z.int().min(0).describe('Width in pixels (non-negative).'),
		h: z.int().min(0).describe('Height in pixels (non-negative).'),
		format: pixelFormatSchema.meta({ default: 'rgb' }).optional(),
	})
	.describe('Bitmap content dimensions and format.')
	.meta({ id: 'SurfaceSchemaBitmapConfig', title: 'SurfaceSchemaBitmapConfig' })

const ledsConfigSchema = z
	.object({
		segments: z.int().min(1).describe('The number of individually addressable LED segments.'),
		mode: z
			.enum(['full-ring', 'simple'])
			.describe(
				"How Companion maps a gauge onto these LEDs. `full-ring`: the LEDs form a complete circle and the gauge is rendered faithfully (angles, deadzone and colours respected 1:1); segment 0 is at 6 o'clock and indices increase clockwise. `simple`: any other shape  where the value is swept across all segments, with segment 0 as the 0% end. In both cases the surface re-maps to its physical wiring locally if it differs from these conventions.",
			),
	})
	.describe(
		'If set, the control has an addressable strip/ring of LEDs (e.g. the ring around a Stream Deck Studio encoder) and requests LED colours to be reported. Colours are reported via `SurfaceDrawProps.leds` as a packed RGB buffer, one entry per segment.',
	)
	.meta({ id: 'SurfaceSchemaLedsConfig', title: 'SurfaceSchemaLedsConfig' })

const stylePresetSchema = z
	.object({
		bitmap: bitmapConfigSchema.optional().describe('If set, bitmaps of the specified size will be reported.'),
		text: z.boolean().optional().describe('If true, the control requests text to be reported.'),
		textStyle: z.boolean().optional().describe('If true, the control requests text style properties to be reported'),
		colors: z.enum(['hex', 'rgb']).optional().describe('If set, the control requests colours to be reported.'),
		leds: ledsConfigSchema
			.optional()
			.describe('If set, the control has an addressable strip/ring of LEDs and requests LED colours to be reported.'),
	})
	.describe(
		'Styling options that can be applied to controls. Can be used as the default style or as per-control overrides.',
	)
	.meta({ id: 'SurfaceSchemaControlStylePreset', title: 'SurfaceSchemaControlStylePreset' })

const controlDefinitionSchema = z
	.object({
		row: z.int().min(0).describe('Zero-based row index for layout placement.'),
		column: z.int().min(0).describe('Zero-based column index for layout placement.'),
		stylePreset: z
			.string()
			.regex(/^.+$/)
			.optional()
			.describe(
				'Optional name of a style preset defined in `stylePresets`. If present, the control will use the named preset instead of the default style.',
			),
	})
	.describe(
		'Single control definition. The id must be unique and may be user facing in logs. Typically the id would be in the form of 1/0, matching the row/column of the control.',
	)
	.meta({ id: 'SurfaceSchemaControlDefinition', title: 'SurfaceSchemaControlDefinition' })

export const surfaceLayoutSchema = z
	.object({
		stylePresets: z
			.object({ default: stylePresetSchema })
			.catchall(stylePresetSchema)
			.describe(
				'Named collection of style presets. The preset named `default` is required and is used as the fallback style for controls when no `stylePreset` is specified.',
			),
		controls: z.record(z.string().regex(/^[a-zA-Z0-9\-/]+$/), controlDefinitionSchema),
	})
	.describe(
		'Schema describing a surface layout: default styling and a map of controls with positions and optional style overrides.',
	)
	.meta({ id: 'SurfaceSchemaLayoutDefinition', title: 'SurfaceSchemaLayoutDefinition' })

export type SurfaceSchemaPixelFormat = z.infer<typeof pixelFormatSchema>
export type SurfaceSchemaBitmapConfig = z.infer<typeof bitmapConfigSchema>
export type SurfaceSchemaLedsConfig = z.infer<typeof ledsConfigSchema>
export type SurfaceSchemaControlStylePreset = z.infer<typeof stylePresetSchema>
export type SurfaceSchemaControlDefinition = z.infer<typeof controlDefinitionSchema>
export type SurfaceSchemaLayoutDefinition = z.infer<typeof surfaceLayoutSchema>
