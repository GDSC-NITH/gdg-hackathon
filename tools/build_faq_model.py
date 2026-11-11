#!/usr/bin/env python3
"""
Generates the 3D Voxel FAQ & Knowledge Pavilion model (gdg_faq.glb).
Minecraft-style enchanted library with:
- Stepped deepslate dais with gold corner brackets
- 4 grand chiseled quartz corner pillars and arched vaulted canopy
- Tiered dark prismarine/copper pavilion roof with roof finial
- Central obsidian & diamond enchantment altar
- Open magical spellbook/grimoire with gold corner clasps and parchment pages
- Hovering diamond Knowledge Crystal & levitating arcane glyph cubes
- Distinct 3D voxel Question-Mark ('?') knowledge emblem on the front pediment
- Multi-tier archival bookshelves with colorful book spines
- Hanging reading lanterns on wrought-iron chains with warm lantern glow
"""

import struct
import json
import os
import math

class VoxelModelBuilder:
    def __init__(self):
        self.categories = {}  # cat_name -> list of boxes [(x, y, z, sx, sy, sz)]

    def add_box(self, cat, x, y, z, sx, sy, sz):
        """Add an axis-aligned box with bottom-center or center."""
        if cat not in self.categories:
            self.categories[cat] = []
        self.categories[cat].append((x, y, z, sx, sy, sz))

    def build_glb(self, output_paths):
        # Build 3D mesh primitives per category
        nodes = []
        meshes = []
        materials = []
        accessors = []
        buffer_views = []
        bin_chunks = []
        byte_offset = 0

        # Colors for fallback display if viewed raw
        CAT_COLORS = {
            'floating_crystal': [0.1, 0.9, 1.0, 0.9],
            'floating_glyph': [1.0, 0.7, 0.2, 1.0],
            'question_mark': [1.0, 0.85, 0.2, 1.0],
            'enchanted_book': [0.55, 0.15, 0.35, 1.0],
            'book_pages': [0.95, 0.92, 0.82, 1.0],
            'altar_stone': [0.12, 0.12, 0.16, 1.0],
            'bookshelf_wood': [0.35, 0.22, 0.14, 1.0],
            'book_spines': [0.8, 0.25, 0.25, 1.0],
            'pavilion_pillar': [0.75, 0.76, 0.78, 1.0],
            'pavilion_roof': [0.22, 0.45, 0.42, 1.0],
            'lantern_iron': [0.15, 0.15, 0.18, 1.0],
            'lantern_glow': [1.0, 0.75, 0.25, 1.0],
            'gold_trim': [0.95, 0.78, 0.18, 1.0],
            'base_plinth': [0.25, 0.27, 0.32, 1.0],
        }

        # Quad face definitions with normals
        # Format: (normal, [(dx, dy, dz), ...]) for unit box [-0.5, 0.5]
        BOX_FACES = [
            ((0, 1, 0), [(-0.5, 0.5, -0.5), (-0.5, 0.5, 0.5), (0.5, 0.5, 0.5), (0.5, 0.5, -0.5)]), # Top +Y
            ((0, -1, 0), [(-0.5, -0.5, 0.5), (-0.5, -0.5, -0.5), (0.5, -0.5, -0.5), (0.5, -0.5, 0.5)]), # Bottom -Y
            ((0, 0, 1), [(-0.5, -0.5, 0.5), (0.5, -0.5, 0.5), (0.5, 0.5, 0.5), (-0.5, 0.5, 0.5)]), # Front +Z
            ((0, 0, -1), [(0.5, -0.5, -0.5), (-0.5, -0.5, -0.5), (-0.5, 0.5, -0.5), (0.5, 0.5, -0.5)]), # Back -Z
            ((1, 0, 0), [(0.5, -0.5, 0.5), (0.5, -0.5, -0.5), (0.5, 0.5, -0.5), (0.5, 0.5, 0.5)]), # Right +X
            ((-1, 0, 0), [(-0.5, -0.5, -0.5), (-0.5, -0.5, 0.5), (-0.5, 0.5, 0.5), (-0.5, 0.5, -0.5)]) # Left -X
        ]

        node_indices = []

        for cat_idx, (cat_name, boxes) in enumerate(self.categories.items()):
            positions = []
            normals = []
            indices = []
            vert_count = 0

            for bx, by, bz, bsx, bsy, bsz in boxes:
                # y is bottom of box in our coordinate convention
                cy = by + bsy * 0.5
                for norm, quad in BOX_FACES:
                    for vx, vy, vz in quad:
                        world_x = bx + vx * bsx
                        world_y = cy + vy * bsy
                        world_z = bz + vz * bsz
                        positions.extend([world_x, world_y, world_z])
                        normals.extend(norm)
                    indices.extend([
                        vert_count, vert_count + 1, vert_count + 2,
                        vert_count, vert_count + 2, vert_count + 3
                    ])
                    vert_count += 4

            if not positions:
                continue

            # Min/max for position accessor
            min_x = min(positions[0::3]); max_x = max(positions[0::3])
            min_y = min(positions[1::3]); max_y = max(positions[1::3])
            min_z = min(positions[2::3]); max_z = max(positions[2::3])

            pos_bytes = struct.pack(f'<{len(positions)}f', *positions)
            norm_bytes = struct.pack(f'<{len(normals)}f', *normals)

            use_uint32 = vert_count > 65535
            if use_uint32:
                idx_bytes = struct.pack(f'<{len(indices)}I', *indices)
                idx_type = 5125 # UNSIGNED_INT
            else:
                idx_bytes = struct.pack(f'<{len(indices)}H', *indices)
                idx_type = 5123 # UNSIGNED_SHORT

            # Align buffers to 4-byte boundaries
            def pad4(b):
                p = (4 - (len(b) % 4)) % 4
                return b + b'\x00' * p, p

            # BufferView 0: Positions
            p_bytes, _ = pad4(pos_bytes)
            bv_pos = len(buffer_views)
            buffer_views.append({
                'buffer': 0,
                'byteOffset': byte_offset,
                'byteLength': len(pos_bytes),
                'target': 34962 # ARRAY_BUFFER
            })
            bin_chunks.append(p_bytes)
            byte_offset += len(p_bytes)

            # BufferView 1: Normals
            n_bytes, _ = pad4(norm_bytes)
            bv_norm = len(buffer_views)
            buffer_views.append({
                'buffer': 0,
                'byteOffset': byte_offset,
                'byteLength': len(norm_bytes),
                'target': 34962
            })
            bin_chunks.append(n_bytes)
            byte_offset += len(n_bytes)

            # BufferView 2: Indices
            i_bytes, _ = pad4(idx_bytes)
            bv_idx = len(buffer_views)
            buffer_views.append({
                'buffer': 0,
                'byteOffset': byte_offset,
                'byteLength': len(idx_bytes),
                'target': 34963 # ELEMENT_ARRAY_BUFFER
            })
            bin_chunks.append(i_bytes)
            byte_offset += len(i_bytes)

            acc_pos = len(accessors)
            accessors.append({
                'bufferView': bv_pos,
                'byteOffset': 0,
                'componentType': 5126,
                'count': len(positions) // 3,
                'type': 'VEC3',
                'max': [max_x, max_y, max_z],
                'min': [min_x, min_y, min_z]
            })

            acc_norm = len(accessors)
            accessors.append({
                'bufferView': bv_norm,
                'byteOffset': 0,
                'componentType': 5126,
                'count': len(normals) // 3,
                'type': 'VEC3',
                'max': [1.0, 1.0, 1.0],
                'min': [-1.0, -1.0, -1.0]
            })

            acc_idx = len(accessors)
            accessors.append({
                'bufferView': bv_idx,
                'byteOffset': 0,
                'componentType': idx_type,
                'count': len(indices),
                'type': 'SCALAR'
            })

            # Material
            mat_idx = len(materials)
            color = CAT_COLORS.get(cat_name, [0.7, 0.7, 0.7, 1.0])
            materials.append({
                'name': f'mat_{cat_name}',
                'pbrMetallicRoughness': {
                    'baseColorFactor': color,
                    'metallicFactor': 0.2,
                    'roughnessFactor': 0.4
                }
            })

            mesh_idx = len(meshes)
            meshes.append({
                'name': f'mesh_{cat_name}',
                'primitives': [{
                    'attributes': {'POSITION': acc_pos, 'NORMAL': acc_norm},
                    'indices': acc_idx,
                    'material': mat_idx
                }]
            })

            curr_node = len(nodes)
            nodes.append({
                'name': cat_name,
                'mesh': mesh_idx
            })
            node_indices.append(curr_node)

        # Root node
        root_node_idx = len(nodes)
        nodes.append({
            'name': 'world',
            'children': node_indices
        })

        bin_data = b''.join(bin_chunks)

        gltf = {
            'asset': {'version': '2.0', 'generator': 'Labyrinth FAQ Voxel Builder v1.0'},
            'scene': 0,
            'scenes': [{'nodes': [root_node_idx]}],
            'nodes': nodes,
            'meshes': meshes,
            'materials': materials,
            'accessors': accessors,
            'bufferViews': buffer_views,
            'buffers': [{'byteLength': len(bin_data)}]
        }

        json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
        json_pad = (4 - (len(json_bytes) % 4)) % 4
        json_bytes += b' ' * json_pad

        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
        header = struct.pack('<4sII', b'glTF', 2, total_len)
        chunk0 = struct.pack('<I4s', len(json_bytes), b'JSON') + json_bytes
        chunk1 = struct.pack('<I4s', len(bin_data), b'BIN\x00') + bin_data
        glb = header + chunk0 + chunk1

        for p in output_paths:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'wb') as f:
                f.write(glb)
            print(f'Wrote {p} ({len(glb):,} bytes, {len(self.categories)} feature categories)')


def build_faq_scene():
    b = VoxelModelBuilder()

    # ==========================================
    # 1. BASE PLINTH & FOUNDATION
    # Stepped ceremonial deepslate platform with stone stairs
    # ==========================================
    # Bottom stepped plinth
    b.add_box('base_plinth', 0, 0.0, 0, 3.8, 0.16, 3.8)
    # Mid plinth tier
    b.add_box('base_plinth', 0, 0.16, 0, 3.5, 0.14, 3.5)
    # Inner polished flagstone floor
    b.add_box('base_plinth', 0, 0.30, 0, 3.2, 0.08, 3.2)
    # Front entrance steps (+Z)
    b.add_box('base_plinth', 0, 0.0, 2.0, 1.8, 0.08, 0.32)
    b.add_box('base_plinth', 0, 0.08, 1.85, 1.6, 0.08, 0.32)

    # Gold corner plinth brackets
    for px in [-1.75, 1.75]:
        for pz in [-1.75, 1.75]:
            b.add_box('gold_trim', px, 0.16, pz, 0.22, 0.08, 0.22)
            b.add_box('gold_trim', px, 0.24, pz, 0.12, 0.08, 0.12)

    # ==========================================
    # 2. FOUR GRAND CORNER PILLARS & ARCHES
    # Chiseled quartz / polished stone columns
    # ==========================================
    pillar_coords = [(-1.35, -1.35), (1.35, -1.35), (-1.35, 1.35), (1.35, 1.35)]
    for px, pz in pillar_coords:
        # Pillar plinth foot
        b.add_box('pavilion_pillar', px, 0.38, pz, 0.44, 0.16, 0.44)
        # Main vertical column shaft
        b.add_box('pavilion_pillar', px, 0.54, pz, 0.34, 2.0, 0.34)
        # Pillar decorative collar
        b.add_box('gold_trim', px, 1.45, pz, 0.38, 0.06, 0.38)
        # Pillar capital
        b.add_box('pavilion_pillar', px, 2.54, pz, 0.46, 0.18, 0.46)
        b.add_box('pavilion_pillar', px, 2.72, pz, 0.54, 0.14, 0.54)

    # Overhead Vaulted Beams & Archways connecting the pillars
    # Left & Right Arch Beams (along Z)
    b.add_box('pavilion_pillar', -1.35, 2.72, 0, 0.36, 0.22, 2.4)
    b.add_box('pavilion_pillar', 1.35, 2.72, 0, 0.36, 0.22, 2.4)
    # Back Wall Beam (along X)
    b.add_box('pavilion_pillar', 0, 2.72, -1.35, 2.4, 0.22, 0.36)
    # Front Arch Beam (along X)
    b.add_box('pavilion_pillar', 0, 2.72, 1.35, 2.4, 0.22, 0.36)

    # ==========================================
    # 3. TIERED PAVILION ROOF & CANOPY
    # Rich dark prismarine / copper roof shingles with curved eaves
    # ==========================================
    # Eaves layer extending outward
    b.add_box('pavilion_roof', 0, 2.86, 0, 3.8, 0.14, 3.8)
    # Gold eave corner finials
    for ex in [-1.9, 1.9]:
        for ez in [-1.9, 1.9]:
            b.add_box('gold_trim', ex, 2.92, ez, 0.18, 0.14, 0.18)

    # Tier 2 roof
    b.add_box('pavilion_roof', 0, 3.00, 0, 3.2, 0.18, 3.2)
    # Tier 3 roof
    b.add_box('pavilion_roof', 0, 3.18, 0, 2.6, 0.20, 2.6)
    # Tier 4 skylight cupola base
    b.add_box('pavilion_pillar', 0, 3.38, 0, 1.8, 0.22, 1.8)
    # Cupola crown
    b.add_box('pavilion_roof', 0, 3.60, 0, 2.0, 0.16, 2.0)
    # Spire finial
    b.add_box('gold_trim', 0, 3.76, 0, 0.32, 0.24, 0.32)
    b.add_box('gold_trim', 0, 4.00, 0, 0.16, 0.32, 0.16)
    b.add_box('floating_crystal', 0, 4.32, 0, 0.12, 0.18, 0.12)

    # ==========================================
    # 4. QUESTION MARK MOTIF (Front Facade Emblem)
    # 3D voxel '?' emblem mounted prominently above the front entrance arch
    # ==========================================
    # Backing plaque
    b.add_box('altar_stone', 0, 2.22, 1.48, 0.96, 1.10, 0.08)
    b.add_box('gold_trim', 0, 2.22, 1.46, 1.04, 1.18, 0.04)

    # Voxel Question Mark Blocks (?):
    # Dot at bottom
    b.add_box('question_mark', 0.0, 2.30, 1.54, 0.14, 0.14, 0.08)
    # Vertical stalk
    b.add_box('question_mark', 0.0, 2.52, 1.54, 0.14, 0.22, 0.08)
    # Right turn of the hook
    b.add_box('question_mark', 0.14, 2.74, 1.54, 0.14, 0.16, 0.08)
    b.add_box('question_mark', 0.20, 2.90, 1.54, 0.14, 0.18, 0.08)
    # Top arc curve
    b.add_box('question_mark', 0.12, 3.06, 1.54, 0.16, 0.14, 0.08)
    b.add_box('question_mark', 0.0, 3.08, 1.54, 0.18, 0.14, 0.08)
    b.add_box('question_mark', -0.14, 3.04, 1.54, 0.16, 0.14, 0.08)
    # Left downward curve
    b.add_box('question_mark', -0.20, 2.92, 1.54, 0.14, 0.16, 0.08)

    # ==========================================
    # 5. ARCHIVAL BOOKSHELVES (Left, Right & Back)
    # Multi-tier carved dark oak shelves lined with colorful book spines
    # ==========================================
    # Back Wall Bookshelf Unit
    b.add_box('bookshelf_wood', 0, 0.38, -1.30, 2.0, 2.15, 0.32)
    # Shelving horizontal dividers
    for sy in [0.85, 1.35, 1.85]:
        b.add_box('bookshelf_wood', 0, sy, -1.26, 1.96, 0.05, 0.36)

    # Book spines on back shelf (row 1, 2, 3)
    spine_colors_x = [-0.85, -0.68, -0.50, -0.32, -0.15, 0.02, 0.20, 0.38, 0.56, 0.74]
    for row_y in [0.42, 0.92, 1.42]:
        for idx, bx in enumerate(spine_colors_x):
            # Vary height and depth for natural library look
            h_var = 0.34 if idx % 2 == 0 else 0.38
            d_var = 0.22 if idx % 3 == 0 else 0.26
            b.add_box('book_spines', bx, row_y, -1.24, 0.13, h_var, d_var)

    # Left Wall Bookshelf Unit
    b.add_box('bookshelf_wood', -1.30, 0.38, 0, 0.32, 2.15, 2.0)
    for sy in [0.85, 1.35, 1.85]:
        b.add_box('bookshelf_wood', -1.26, sy, 0, 0.36, 0.05, 1.96)
    for row_y in [0.42, 0.92, 1.42]:
        for idx, bz in enumerate(spine_colors_x):
            h_var = 0.35 if idx % 3 == 0 else 0.39
            d_var = 0.22 if idx % 2 == 0 else 0.25
            b.add_box('book_spines', -1.24, row_y, bz, d_var, h_var, 0.13)

    # Right Wall Bookshelf Unit
    b.add_box('bookshelf_wood', 1.30, 0.38, 0, 0.32, 2.15, 2.0)
    for sy in [0.85, 1.35, 1.85]:
        b.add_box('bookshelf_wood', 1.26, sy, 0, 0.36, 0.05, 1.96)
    for row_y in [0.42, 0.92, 1.42]:
        for idx, bz in enumerate(spine_colors_x):
            h_var = 0.36 if idx % 2 == 0 else 0.33
            d_var = 0.23 if idx % 3 == 0 else 0.26
            b.add_box('book_spines', 1.24, row_y, bz, d_var, h_var, 0.13)

    # ==========================================
    # 6. CENTRAL ENCHANTMENT ALTAR & PEDESTAL
    # Obsidian & Diamond altar table with crimson velvet cover
    # ==========================================
    # Obsidian plinth
    b.add_box('altar_stone', 0, 0.38, 0.05, 1.12, 0.22, 1.12)
    # Diamond reinforcement layer
    b.add_box('gold_trim', 0, 0.60, 0.05, 0.96, 0.12, 0.96)
    # Crimson velvet cloth top
    b.add_box('enchanted_book', 0, 0.72, 0.05, 1.04, 0.06, 1.04)

    # Corner gold corner studs on the altar
    for ax in [-0.46, 0.46]:
        for az in [-0.41, 0.51]:
            b.add_box('gold_trim', ax, 0.72, az, 0.12, 0.07, 0.12)

    # ==========================================
    # 7. OPEN ENCHANTED GRIMOIRE / SPELLBOOK
    # Open spellbook with gold clasps and parchment pages
    # ==========================================
    # Book spine & cover base
    b.add_box('enchanted_book', 0, 0.78, 0.05, 0.54, 0.04, 0.42)
    # Angled open left page block
    b.add_box('book_pages', -0.14, 0.82, 0.05, 0.24, 0.05, 0.36)
    # Angled open right page block
    b.add_box('book_pages', 0.14, 0.82, 0.05, 0.24, 0.05, 0.36)
    # Gilded bookmark ribbon
    b.add_box('gold_trim', 0, 0.83, 0.24, 0.04, 0.02, 0.14)
    # Golden page corners
    b.add_box('gold_trim', -0.23, 0.83, 0.20, 0.05, 0.03, 0.05)
    b.add_box('gold_trim', 0.23, 0.83, 0.20, 0.05, 0.03, 0.05)
    b.add_box('gold_trim', -0.23, 0.83, -0.10, 0.05, 0.03, 0.05)
    b.add_box('gold_trim', 0.23, 0.83, -0.10, 0.05, 0.03, 0.05)

    # ==========================================
    # 8. FLOATING KNOWLEDGE CRYSTAL & GLYPHS
    # Hovering diamond-octahedron and arcane energy cubes
    # ==========================================
    # Central Floating Knowledge Crystal
    b.add_box('floating_crystal', 0, 1.18, 0.05, 0.22, 0.28, 0.22)
    b.add_box('floating_crystal', 0, 1.22, 0.05, 0.28, 0.20, 0.28)

    # Orbiting / Floating mystic glyph voxels at varied heights
    glyphs = [
        (-0.28, 1.05, 0.22, 0.07),
        (0.30, 1.12, 0.24, 0.08),
        (-0.24, 1.32, -0.15, 0.07),
        (0.26, 1.36, -0.12, 0.06),
        (0.00, 1.48, 0.25, 0.08),
        (0.00, 1.02, -0.18, 0.07),
    ]
    for gx, gy, gz, gs in glyphs:
        b.add_box('floating_glyph', gx, gy, gz, gs, gs, gs)

    # ==========================================
    # 9. READING LECTERNS (Front-Left & Front-Right)
    # Reading stands with scrolls and open codices
    # ==========================================
    for lx in [-1.15, 1.15]:
        lz = 0.95
        # Lectern foot & post
        b.add_box('bookshelf_wood', lx, 0.38, lz, 0.34, 0.08, 0.34)
        b.add_box('bookshelf_wood', lx, 0.46, lz, 0.16, 0.42, 0.16)
        # Angled lectern top
        b.add_box('bookshelf_wood', lx, 0.88, lz, 0.38, 0.06, 0.34)
        # Open scroll on lectern
        b.add_box('book_pages', lx, 0.94, lz, 0.28, 0.04, 0.24)
        # Gold trim on lectern
        b.add_box('gold_trim', lx, 0.88, lz + 0.16, 0.38, 0.04, 0.03)

    # ==========================================
    # 10. HANGING READING LANTERNS
    # Suspended from the four roof eave corners
    # ==========================================
    lantern_spots = [(-1.50, -1.50), (1.50, -1.50), (-1.50, 1.50), (1.50, 1.50)]
    for lx, lz in lantern_spots:
        # Iron suspension chain from ceiling
        b.add_box('lantern_iron', lx, 2.50, lz, 0.04, 0.36, 0.04)
        # Lantern roof cap
        b.add_box('lantern_iron', lx, 2.38, lz, 0.22, 0.05, 0.22)
        # Lantern iron frame corners
        b.add_box('lantern_iron', lx, 2.12, lz, 0.20, 0.26, 0.20)
        # Inner warm incandescent glowing core
        b.add_box('lantern_glow', lx, 2.15, lz, 0.14, 0.20, 0.14)
        # Lantern bottom base
        b.add_box('lantern_iron', lx, 2.07, lz, 0.22, 0.05, 0.22)

    return b


if __name__ == '__main__':
    builder = build_faq_scene()
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_paths = [
        os.path.join(root_dir, 'assets', 'models', 'gdg_faq.glb'),
        os.path.join(root_dir, 'assets', 'gdg_faq.glb')
    ]
    builder.build_glb(target_paths)

