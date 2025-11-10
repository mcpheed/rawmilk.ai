import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './search.dto';

@Controller('/v1/search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  async search(@Query() q: SearchQueryDto) {
    return this.svc.searchNearby(q);
  }
}
