package com.credx.keyforge.repository;

import com.credx.keyforge.entity.ServiceCategory;
import com.credx.keyforge.entity.ServiceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ServiceListingRepository extends JpaRepository<ServiceListing, String> {

    Optional<ServiceListing> findBySlug(String slug);

    List<ServiceListing> findByProviderUserIdOrderByCreatedAtDesc(String providerUserId);

    List<ServiceListing> findAllByIsActiveTrueOrderByCreatedAtDesc();

    List<ServiceListing> findByIsActiveTrueOrderByCreatedAtDesc();

    List<ServiceListing> findAllByIsActiveTrueAndCategoryOrderByCreatedAtDesc(ServiceCategory category);

    List<ServiceListing> findByCategoryAndIsActiveTrue(ServiceCategory category);

    @Query("SELECT s FROM ServiceListing s WHERE s.isActive = true " +
           "AND (LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.providerName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<ServiceListing> searchByKeyword(@Param("search") String search);

    @Query("SELECT s FROM ServiceListing s WHERE s.isActive = true " +
           "AND (LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.providerName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<ServiceListing> search(@Param("search") String search);

    @Query("SELECT s FROM ServiceListing s WHERE s.isActive = true " +
           "AND s.category = :category " +
           "AND (LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.providerName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<ServiceListing> searchByCategoryAndKeyword(@Param("category") ServiceCategory category, @Param("search") String search);

    @Query("SELECT s FROM ServiceListing s WHERE s.isActive = true " +
           "AND s.category = :category " +
           "AND (LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.description) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(s.providerName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY s.createdAt DESC")
    List<ServiceListing> findByCategoryAndSearch(@Param("category") ServiceCategory category, @Param("search") String search);
}
