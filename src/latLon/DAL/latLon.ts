import { Column, Entity, PrimaryColumn } from 'typeorm';
import { LatLon as ILatLon } from '../models/latLon';

@Entity()
export class LatLon implements ILatLon {
  @PrimaryColumn({ name: 'pk' })
  public primaryKey!: number;

  @Column({ name: 'tile_name' })
  public tileName!: string;

  @Column({ name: 'zone' })
  public zone!: string;

  @Column({ name: 'min_x' })
  public minX!: string;

  @Column({ name: 'min_y' })
  public minY!: string;

  @Column({ name: 'ext_min_x' })
  public extMinX!: number;

  @Column({ name: 'ext_min_y' })
  public extMinY!: number;

  @Column({ name: 'ext_max_x' })
  public extMaxX!: number;

  @Column({ name: 'ext_max_y' })
  public extMaxY!: number;
}
