import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class SearchQueryDto {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lat!: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  lng!: number;

  @Transform(({ value }) => (value ? parseFloat(value) : 75))
  @IsOptional()
  @IsNumber()
  radius_km?: number = 75;

  @Transform(({ value }) => (value ? parseFloat(value) : 0.55))
  @IsOptional()
  @IsNumber()
  min_conf?: number = 0.55;

  @Transform(({ value }) => (value ? parseInt(value) : 20))
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @Transform(({ value }) => (value ? parseInt(value) : 0))
  @IsOptional()
  @IsNumber()
  offset?: number = 0;
}
